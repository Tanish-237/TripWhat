import { Request, Response } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { Conversation } from '../models/Conversation.js';
import { travelAgent } from '../agents/travel-agent.js';
import { itineraryEditor, type ItineraryAction } from '../services/itinerary/index.js';
import { intentDetector } from '../agents/intent-detector.js';

/**
 * Chat Controller - Handles chat requests with Socket.io streaming
 */

let io: SocketIOServer | null = null;

/**
 * Set Socket.io instance
 */
export function setSocketIO(socketIO: SocketIOServer) {
  io = socketIO;
}

/**
 * POST /api/chat
 * Send a message and get AI response
 */
export async function sendMessage(req: Request, res: Response) {
  try {
    const { message, conversationId } = req.body;
    const user = req.user; // From auth middleware

    // Validate input
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Generate or use existing conversation ID
    const convId = conversationId || uuidv4();
    
    // Find or create conversation
    let conversation = await Conversation.findOne({ conversationId: convId });
    
    if (!conversation) {
      conversation = new Conversation({
        conversationId: convId,
        userId: user._id, // Add user reference
        messages: [],
        metadata: {
          userPreferences: user.preferences // Include user preferences
        },
      });
    }

    // Add user message
    conversation.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
    });

    // Save user message
    await conversation.save();

    // Check if this is a modification request
    const detectedIntent = await intentDetector.detectIntent(message);
    const modificationIntents = [
      'add_activity', 'remove_activity', 'replace_activity',
      'modify_activity', 'move_activity', 'add_day', 'remove_day', 'find_and_add'
    ];

    // CRITICAL: Check if itinerary exists in request body (sent from frontend)
    if (req.body.currentItinerary && !conversation.itinerary) {
      console.log('🔄 [CHAT] Found itinerary in request body, syncing to conversation');
      conversation.itinerary = req.body.currentItinerary;
      await conversation.save();
    }

    console.log('🔍 [CHAT] Intent check:', {
      intent: detectedIntent.primary_intent,
      isModification: modificationIntents.includes(detectedIntent.primary_intent),
      hasItinerary: !!conversation.itinerary,
      itineraryDays: conversation.itinerary?.days?.length || 0
    });

    // If it's a modification and itinerary exists, handle it differently
    if (modificationIntents.includes(detectedIntent.primary_intent) && conversation.itinerary) {
      console.log('🔧 [CHAT] Detected modification intent, routing to modification handler');
      
      // Call the modification logic directly
      try {
        req.body.message = message;
        req.body.conversationId = convId;
        return await modifyItinerary(req, res);
      } catch (error) {
        console.error('Modification routing error:', error);
        // Fall through to normal chat if modification fails
      }
    } else if (modificationIntents.includes(detectedIntent.primary_intent) && !conversation.itinerary) {
      console.log('⚠️ [CHAT] Modification intent detected but no itinerary exists yet');
      // Let the agent handle it - it will guide the user to create an itinerary first
    }

    // Emit progress to Socket.io client (both to room and all connected clients)
    if (io) {
      io.emit('agent:status', {
        stage: 'classify',
        status: 'Analyzing your request...',
        conversationId: convId,
      });
    }

    // Get AI response with timeout
    const timeoutPromise = new Promise<any>((_, reject) => {
      setTimeout(() => reject(new Error('Agent timeout after 30 seconds')), 30000);
    });
    
    const agentResult = await Promise.race([
      travelAgent.chat(message, convId),
      timeoutPromise
    ]);

    // Extract the response string from the agent result
    const aiResponse = agentResult.response || 'I apologize, but I had trouble processing your request.';

    console.log('📦 [CHAT] Agent result keys:', Object.keys(agentResult));
    console.log('🗓️ [CHAT] Has itinerary:', !!agentResult.itinerary);

    // Add AI response to conversation
    conversation.messages.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date(),
    });

    // Store itinerary if generated
    if (agentResult.itinerary) {
      conversation.itinerary = agentResult.itinerary;
      console.log('💾 [CHAT] Saved itinerary to conversation');
      console.log('📊 [CHAT] Itinerary has', agentResult.itinerary.days?.length || 0, 'days');
    } else {
      console.log('⚠️ [CHAT] No itinerary in agent result');
    }

    // Save AI message and itinerary
    await conversation.save();
    
    // Verify save
    const savedConv = await Conversation.findOne({ conversationId: convId });
    console.log('✅ [CHAT] Verified saved conversation has itinerary:', !!savedConv?.itinerary);
    if (savedConv?.itinerary) {
      console.log('📊 [CHAT] Saved itinerary has', savedConv.itinerary.days?.length || 0, 'days');
    }

    // Emit completion (broadcast to all clients - they'll filter by conversationId)
    console.log('📡 [SOCKET] Broadcasting agent:response for conversation:', convId);
    if (io) {
      io.emit('agent:response', {
        message: aiResponse,
        conversationId: convId,
        widgets: agentResult.widgets || [],
        suggestions: agentResult.suggestions || [],
        changeSummary: agentResult.changeSummary || [],
        classification: agentResult.classification,
        tripState: agentResult.tripState,
      });
      console.log('✅ [SOCKET] Event broadcast successfully');
    } else {
      console.error('❌ [SOCKET] Socket.io instance not available!');
    }

    // Return response with structured payload
    return res.status(200).json({
      conversationId: convId,
      message: aiResponse,
      widgets: agentResult.widgets || [],
      suggestions: agentResult.suggestions || [],
      changeSummary: agentResult.changeSummary || [],
      classification: agentResult.classification,
      timestamp: new Date(),
    });

  } catch (error) {
    console.error('Chat error:', error);
    
    // Emit error to Socket.io
    if (io) {
      io.emit('agent:error', { 
        error: 'Failed to process your message',
        conversationId: req.body.conversationId
      });
    }

    return res.status(500).json({ 
      error: 'Failed to process your message. Please try again.' 
    });
  }
}

/**
 * GET /api/chat/:conversationId
 * Get conversation history
 */
export async function getConversation(req: Request, res: Response) {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findOne({ conversationId });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    return res.status(200).json({
      conversationId: conversation.conversationId,
      messages: conversation.messages,
      metadata: conversation.metadata,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    });

  } catch (error) {
    console.error('Get conversation error:', error);
    return res.status(500).json({ error: 'Failed to retrieve conversation' });
  }
}

/**
 * DELETE /api/chat/:conversationId
 * Delete a conversation
 */
export async function deleteConversation(req: Request, res: Response) {
  try {
    const { conversationId } = req.params;

    const result = await Conversation.deleteOne({ conversationId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    return res.status(200).json({ message: 'Conversation deleted successfully' });

  } catch (error) {
    console.error('Delete conversation error:', error);
    return res.status(500).json({ error: 'Failed to delete conversation' });
  }
}

/**
 * GET /api/chat
 * List all conversations (for debugging/admin)
 */
export async function listConversations(req: Request, res: Response) {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = parseInt(req.query.skip as string) || 0;

    const conversations = await Conversation
      .find()
      .sort({ updatedAt: -1 })
      .limit(limit)
      .skip(skip)
      .select('conversationId messages metadata createdAt updatedAt');

    const total = await Conversation.countDocuments();

    return res.status(200).json({
      conversations,
      total,
      limit,
      skip,
    });

  } catch (error) {
    console.error('List conversations error:', error);
    return res.status(500).json({ error: 'Failed to list conversations' });
  }
}

/**
 * POST /api/chat/sync-itinerary
 * Sync an itinerary from the form flow to the conversation
 */
export async function syncItinerary(req: Request, res: Response) {
  try {
    const { conversationId, itinerary } = req.body;

    if (!conversationId || !itinerary) {
      return res.status(400).json({ error: 'ConversationId and itinerary are required' });
    }

    // Find or create conversation
    let conversation = await Conversation.findOne({ conversationId });
    
    if (!conversation) {
      conversation = new Conversation({
        conversationId,
        userId: req.user?._id,
        messages: [],
        metadata: {},
      });
    }

    // Save the itinerary
    conversation.itinerary = itinerary;
    await conversation.save();

    console.log('✅ [SYNC] Synced itinerary to conversation:', conversationId);
    console.log('📊 [SYNC] Itinerary has', itinerary.days?.length || 0, 'days');

    return res.status(200).json({
      success: true,
      message: 'Itinerary synced successfully',
      conversationId,
    });

  } catch (error) {
    console.error('Sync itinerary error:', error);
    return res.status(500).json({ error: 'Failed to sync itinerary' });
  }
}

/**
 * POST /api/chat/modify-itinerary
 * Modify an existing itinerary based on user request
 */
export async function modifyItinerary(req: Request, res: Response) {
  try {
    const { message, conversationId } = req.body;
    const user = req.user;

    if (!message || !conversationId) {
      return res.status(400).json({ error: 'Message and conversationId are required' });
    }

    // Load conversation
    const conversation = await Conversation.findOne({ conversationId });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (!conversation.itinerary) {
      return res.status(400).json({ 
        error: 'No itinerary found. Please create an itinerary first.' 
      });
    }

    console.log(`\n🔧 [MODIFY] Processing modification request: "${message}"`);

    // Detect intent
    const detectedIntent = await intentDetector.detectIntent(message);
    console.log('🎯 [MODIFY] Detected intent:', detectedIntent.primary_intent);

    // Check if it's a modification intent
    const modificationIntents = [
      'add_activity',
      'remove_activity',
      'replace_activity',
      'modify_activity',
      'move_activity',
      'add_day',
      'remove_day',
      'find_and_add'
    ];

    if (!modificationIntents.includes(detectedIntent.primary_intent)) {
      return res.status(400).json({
        error: 'This request does not appear to be a modification. Please use the regular chat endpoint.'
      });
    }

    // Extract place name from entities or use LLM to extract from message
    let extractedPlaceName = detectedIntent.entities.place_name || detectedIntent.entities.activity_name;
    
    if (!extractedPlaceName && detectedIntent.primary_intent === 'add_activity') {
      // Use LLM to extract the place name
      console.log('🤖 [MODIFY] Using LLM to extract place name from message');
      const extractionPrompt = `Extract the place/activity name from this request: "${message}"\n\nRespond with ONLY the place name, nothing else. For example, if the message is "Add the Eiffel Tower to Day 2", respond with "Eiffel Tower".`;
      
      try {
        const { ChatOpenAI } = await import('@langchain/openai');
        const model = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0 });
        const response = await model.invoke([{ role: 'user', content: extractionPrompt }]);
        extractedPlaceName = (response.content as string).trim();
        console.log('📝 [MODIFY] LLM extracted place name:', extractedPlaceName);
      } catch (error) {
        console.error('❌ [MODIFY] LLM extraction failed:', error);
      }
    }

    // Build action from detected intent
    const action: ItineraryAction = {
      type: detectedIntent.entities.action_type || 'add',
      target: {
        day: detectedIntent.entities.target_day || undefined,
        timeSlot: detectedIntent.entities.time_slot || undefined,
        activityName: extractedPlaceName || undefined,
        activityId: detectedIntent.entities.activity_id || undefined,
      },
      details: {
        placeName: extractedPlaceName || undefined,
        category: detectedIntent.entities.category ? [detectedIntent.entities.category] : undefined,
        preferences: detectedIntent.entities.preferences || undefined,
      },
    };

    console.log('📋 [MODIFY] Action:', action);

    // Get destination from itinerary
    const destination = conversation.itinerary.destination || 
                       conversation.metadata?.destination || 
                       'the destination';

    // Execute modification
    let result: any;
    let modificationType: string;

    try {
      switch (detectedIntent.primary_intent) {
        case 'add_activity':
          result = await itineraryEditor.addActivity(
            conversation.itinerary,
            action,
            destination
          );
          modificationType = 'added';
          break;

        case 'remove_activity':
          result = itineraryEditor.removeActivity(
            conversation.itinerary,
            action
          );
          modificationType = 'removed';
          break;

        case 'replace_activity':
          result = await itineraryEditor.replaceActivity(
            conversation.itinerary,
            action,
            destination
          );
          modificationType = 'replaced';
          break;

        case 'move_activity':
          result = itineraryEditor.moveActivity(
            conversation.itinerary,
            action
          );
          modificationType = 'moved';
          break;

        case 'find_and_add':
          result = await itineraryEditor.findAndAdd(
            conversation.itinerary,
            action,
            destination
          );
          modificationType = 'added';
          break;

        case 'add_day':
          result = itineraryEditor.addDay(conversation.itinerary);
          modificationType = 'added';
          break;

        case 'remove_day':
          const dayNumber = detectedIntent.entities.target_day || 1;
          result = itineraryEditor.removeDay(conversation.itinerary, dayNumber);
          modificationType = 'removed';
          break;

        default:
          throw new Error(`Unsupported modification type: ${detectedIntent.primary_intent}`);
      }

      console.log(`✅ [MODIFY] Successfully ${modificationType}:`, result.message);

      // Save updated itinerary
      conversation.itinerary = result.itinerary;
      
      // Add system message to conversation
      conversation.messages.push({
        role: 'assistant',
        content: result.message,
        timestamp: new Date(),
      });

      await conversation.save();

      // Emit trip:updated event with change summary
      if (io) {
        io.emit('trip:updated', {
          conversationId,
          trip: result.itinerary,
          changeSummary: result.changeSummary || {
            action: modificationType,
            target: result.message,
          },
        });
        // Legacy event for backward compatibility
        io.emit('itinerary:modified', {
          conversationId,
          updatedItinerary: result.itinerary,
          modification: {
            type: modificationType,
            message: result.message,
            details: result,
          },
        });
        console.log('📡 [MODIFY] Emitted trip:updated event');
      }

      // Return success
      return res.status(200).json({
        success: true,
        message: result.message,
        itinerary: result.itinerary,
        modification: {
          type: modificationType,
          timestamp: new Date(),
        },
      });

    } catch (modificationError: any) {
      console.error('❌ [MODIFY] Error:', modificationError.message);
      
      return res.status(400).json({
        error: modificationError.message || 'Failed to modify itinerary',
        suggestion: 'Please provide more specific details about what you want to modify.',
      });
    }

  } catch (error) {
    console.error('Modify itinerary error:', error);
    
    return res.status(500).json({ 
      error: 'Failed to process modification request. Please try again.' 
    });
  }
}
