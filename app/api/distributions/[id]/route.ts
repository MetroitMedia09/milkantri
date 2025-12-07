import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import Distribution from '@/models/Distribution';
import Allotment from '@/models/Allotment';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

// GET single distribution
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    try {
      jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized - Invalid token'
      }, { status: 401 });
    }

    const { id } = await params;

    // Find distribution
    const distribution = await Distribution.findById(id)
      .populate('product', 'name')
      .populate('distributor', 'name email')
      .populate('allotment', 'quantity');

    if (!distribution) {
      return NextResponse.json({
        success: false,
        message: 'Distribution not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      distribution: {
        id: distribution._id,
        product: {
          id: (distribution.product as any)._id,
          name: (distribution.product as any).name,
        },
        distributor: {
          id: (distribution.distributor as any)._id,
          name: (distribution.distributor as any).name,
          email: (distribution.distributor as any).email,
        },
        allotment: {
          id: (distribution.allotment as any)._id,
          quantity: (distribution.allotment as any).quantity,
        },
        recipientName: distribution.recipientName,
        quantity: distribution.quantity,
        notes: distribution.notes,
        createdAt: distribution.createdAt,
        updatedAt: distribution.updatedAt,
      }
    });
  } catch (error) {
    console.error('Fetch distribution error:', error);
    return NextResponse.json({
      success: false,
      message: 'An error occurred while fetching the distribution',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT - Update distribution
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();
    const { recipientName, quantity, notes } = body;

    // Validate input
    if (!recipientName || !quantity) {
      return NextResponse.json({
        success: false,
        message: 'Recipient name and quantity are required'
      }, { status: 400 });
    }

    if (quantity < 1) {
      return NextResponse.json({
        success: false,
        message: 'Quantity must be at least 1'
      }, { status: 400 });
    }

    // Find distribution
    const distribution = await Distribution.findById(id);

    if (!distribution) {
      return NextResponse.json({
        success: false,
        message: 'Distribution not found'
      }, { status: 404 });
    }

    // Check authorization - distributors can only update their own distributions
    if (user.role === 'distributor' && distribution.distributor.toString() !== decoded.userId) {
      return NextResponse.json({
        success: false,
        message: 'Forbidden - You can only update your own distributions'
      }, { status: 403 });
    }

    // Check if enough quantity is available (excluding current distribution)
    const allotment = await Allotment.findById(distribution.allotment);
    const existingDistributions = await Distribution.find({
      allotment: distribution.allotment,
      _id: { $ne: id }
    });
    const totalDistributed = existingDistributions.reduce((sum, dist) => sum + dist.quantity, 0);
    const availableQuantity = allotment.quantity - totalDistributed;

    if (quantity > availableQuantity) {
      return NextResponse.json({
        success: false,
        message: `Insufficient quantity. Available: ${availableQuantity}`
      }, { status: 400 });
    }

    // Update distribution
    distribution.recipientName = recipientName.trim();
    distribution.quantity = parseInt(quantity);
    distribution.notes = notes?.trim();
    await distribution.save();

    // Populate the response
    const populatedDistribution = await Distribution.findById(distribution._id)
      .populate('product', 'name')
      .populate('distributor', 'name email')
      .populate('allotment', 'quantity');

    if (!populatedDistribution) {
      return NextResponse.json({
        success: false,
        message: 'Distribution not found after update'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Distribution updated successfully',
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
        updatedAt: populatedDistribution.updatedAt,
      }
    });
  } catch (error) {
    console.error('Update distribution error:', error);
    return NextResponse.json({
      success: false,
      message: 'An error occurred while updating the distribution',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE distribution
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Find distribution
    const distribution = await Distribution.findById(id);

    if (!distribution) {
      return NextResponse.json({
        success: false,
        message: 'Distribution not found'
      }, { status: 404 });
    }

    // Check authorization - distributors can only delete their own distributions
    if (user.role === 'distributor' && distribution.distributor.toString() !== decoded.userId) {
      return NextResponse.json({
        success: false,
        message: 'Forbidden - You can only delete your own distributions'
      }, { status: 403 });
    }

    // Delete distribution
    await Distribution.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Distribution deleted successfully',
    });
  } catch (error) {
    console.error('Delete distribution error:', error);
    return NextResponse.json({
      success: false,
      message: 'An error occurred while deleting the distribution',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
