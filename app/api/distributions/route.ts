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
      distributions: distributions.map(dist => ({
        id: dist._id,
        product: {
          id: dist.product._id,
          name: dist.product.name,
        },
        distributor: {
          id: dist.distributor._id,
          name: dist.distributor.name,
          email: dist.distributor.email,
        },
        allotment: {
          id: dist.allotment._id,
          quantity: dist.allotment.quantity,
        },
        recipientName: dist.recipientName,
        quantity: dist.quantity,
        notes: dist.notes,
        createdAt: dist.createdAt,
      }))
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

    return NextResponse.json({
      success: true,
      message: 'Distribution created successfully',
      distribution: {
        id: populatedDistribution._id,
        product: {
          id: populatedDistribution.product._id,
          name: populatedDistribution.product.name,
        },
        distributor: {
          id: populatedDistribution.distributor._id,
          name: populatedDistribution.distributor.name,
          email: populatedDistribution.distributor.email,
        },
        allotment: {
          id: populatedDistribution.allotment._id,
          quantity: populatedDistribution.allotment.quantity,
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
