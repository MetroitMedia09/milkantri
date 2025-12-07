import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import Distribution from '@/models/Distribution';
import Allotment from '@/models/Allotment';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

// GET all distributions
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized - No token provided'
      }, { status: 401 });
    }

    const token = authHeader.substring(7);

    // Verify token
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized - Invalid token'
      }, { status: 401 });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }

    // Build query based on role
    const query = user.role === 'distributor'
      ? { distributor: decoded.userId }
      : {}; // Admin can see all

    // Get all distributions with populated data
    const distributions = await Distribution.find(query)
      .populate('product', 'name')
      .populate('distributor', 'name email')
      .populate('allotment', 'quantity')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      distributions: distributions.map(dist => {
        const product = dist.product as any;
        const distributor = dist.distributor as any;
        const allotment = dist.allotment as any;

        return {
          id: dist._id,
          product: product ? {
            id: product._id,
            name: product.name,
          } : null,
          distributor: distributor ? {
            id: distributor._id,
            name: distributor.name,
            email: distributor.email,
          } : null,
          allotment: allotment ? {
            id: allotment._id,
            quantity: allotment.quantity,
          } : null,
          recipientName: dist.recipientName,
          quantity: dist.quantity,
          notes: dist.notes,
          createdAt: dist.createdAt,
        };
      })
    });
  } catch (error) {
    console.error('Fetch distributions error:', error);
    return NextResponse.json({
      success: false,
      message: 'An error occurred while fetching distributions',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST - Create new distribution
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized - No token provided'
      }, { status: 401 });
    }

    const token = authHeader.substring(7);

    // Verify token
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized - Invalid token'
      }, { status: 401 });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }

    const body = await request.json();
    const { allotmentId, recipientName, quantity, notes } = body;

    // Validate input
    if (!allotmentId || !recipientName || !quantity) {
      return NextResponse.json({
        success: false,
        message: 'Allotment, recipient name, and quantity are required'
      }, { status: 400 });
    }

    if (quantity < 1) {
      return NextResponse.json({
        success: false,
        message: 'Quantity must be at least 1'
      }, { status: 400 });
    }

    // Find the allotment
    const allotment = await Allotment.findById(allotmentId);
    if (!allotment) {
      return NextResponse.json({
        success: false,
        message: 'Allotment not found'
      }, { status: 404 });
    }

    // Check if allotment is collected
    if (allotment.status !== 'collected') {
      return NextResponse.json({
        success: false,
        message: 'Can only distribute from collected allotments'
      }, { status: 400 });
    }

    // Check authorization - distributors can only distribute their own allotments
    if (user.role === 'distributor' && allotment.distributor.toString() !== decoded.userId) {
      return NextResponse.json({
        success: false,
        message: 'Forbidden - You can only distribute your own allotments'
      }, { status: 403 });
    }

    // Check if enough quantity is available
    const existingDistributions = await Distribution.find({ allotment: allotmentId });
    const totalDistributed = existingDistributions.reduce((sum, dist) => sum + dist.quantity, 0);
    const availableQuantity = allotment.quantity - totalDistributed;

    if (quantity > availableQuantity) {
      return NextResponse.json({
        success: false,
        message: `Insufficient quantity. Available: ${availableQuantity}`
      }, { status: 400 });
    }

    // Create distribution
    const distribution = await Distribution.create({
      distributor: allotment.distributor,
      product: allotment.product,
      allotment: allotmentId,
      recipientName: recipientName.trim(),
      quantity: parseInt(quantity),
      notes: notes?.trim(),
    });

    // Populate the response
    const populatedDistribution = await Distribution.findById(distribution._id)
      .populate('product', 'name')
      .populate('distributor', 'name email')
      .populate('allotment', 'quantity');

    if (!populatedDistribution) {
      return NextResponse.json({
        success: false,
        message: 'Distribution not found after creation'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Distribution created successfully',
      distribution: {
        id: populatedDistribution._id,
        product: {
          id: (populatedDistribution.product as any)._id,
          name: (populatedDistribution.product as any).name,
        },
        distributor: {
          id: (populatedDistribution.distributor as any)._id,
          name: (populatedDistribution.distributor as any).name,
          email: (populatedDistribution.distributor as any).email,
        },
        allotment: {
          id: (populatedDistribution.allotment as any)._id,
          quantity: (populatedDistribution.allotment as any).quantity,
        },
        recipientName: populatedDistribution.recipientName,
        quantity: populatedDistribution.quantity,
        notes: populatedDistribution.notes,
        createdAt: populatedDistribution.createdAt,
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Create distribution error:', error);
    return NextResponse.json({
      success: false,
      message: 'An error occurred while creating the distribution',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
