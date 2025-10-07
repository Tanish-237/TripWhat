import { Request, Response } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { Conversation } from '../models/Conversation.js';
import { travelAgent } from '../agents/travel-agent.js';

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

    // Emit progress to Socket.io client (both to room and all connected clients)
    if (io) {
      io.emit('agent:thinking', { 
        status: 'Analyzing your request...',
        conversationId: convId 
      });
    }

    // Get AI response with timeout
    const timeoutPromise = new Promise<string>((_, reject) => {
      setTimeout(() => reject(new Error('Agent timeout after 30 seconds')), 30000);
    });
    
    const aiResponse = await Promise.race([
      travelAgent.chat(message, convId),
      timeoutPromise
    ]);

    // Add AI response to conversation
    conversation.messages.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date(),
    });

    // Save AI message
    await conversation.save();

    // Emit completion (broadcast to all clients - they'll filter by conversationId)
    console.log('📡 [SOCKET] Broadcasting agent:response for conversation:', convId);
    if (io) {
      io.emit('agent:response', { 
        message: aiResponse,
        conversationId: convId 
      });
      console.log('✅ [SOCKET] Event broadcast successfully');
    } else {
      console.error('❌ [SOCKET] Socket.io instance not available!');
    }

    // Return response
    return res.status(200).json({
      conversationId: convId,
      message: aiResponse,
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
