import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import Allotment from '@/models/Allotment';
import Product from '@/models/Product';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

// GET all allotments
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

    // Get all allotments with populated data
    const allotments = await Allotment.find()
      .populate('product', 'name')
      .populate('distributor', 'name email')
      .populate('allottedBy', 'name')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      allotments: allotments.map(allot => ({
        id: allot._id,
        product: {
          id: allot.product._id,
          name: allot.product.name,
        },
        distributor: {
          id: allot.distributor._id,
          name: allot.distributor.name,
          email: allot.distributor.email,
        },
        quantity: allot.quantity,
        status: allot.status,
        notes: allot.notes,
        allottedBy: {
          id: allot.allottedBy._id,
          name: allot.allottedBy.name,
        },
        createdAt: allot.createdAt,
      }))
    });
  } catch (error) {
    console.error('Fetch allotments error:', error);
    return NextResponse.json({
      success: false,
      message: 'An error occurred while fetching allotments',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST - Create new allotment
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

    // Check if user is admin
    const user = await User.findById(decoded.userId);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({
        success: false,
        message: 'Forbidden - Admin access required'
      }, { status: 403 });
    }

    const body = await request.json();
    const { productId, distributorId, quantity, notes } = body;

    // Validate input
    if (!productId || !distributorId || !quantity) {
      return NextResponse.json({
        success: false,
        message: 'Product, distributor, and quantity are required'
      }, { status: 400 });
    }

    if (quantity < 1) {
      return NextResponse.json({
        success: false,
        message: 'Quantity must be at least 1'
      }, { status: 400 });
    }

    // Check if product exists and has enough quantity
    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json({
        success: false,
        message: 'Product not found'
      }, { status: 404 });
    }

    if (product.quantity < quantity) {
      return NextResponse.json({
        success: false,
        message: `Insufficient quantity. Available: ${product.quantity}`
      }, { status: 400 });
    }

    // Check if distributor exists
    const distributor = await User.findOne({ _id: distributorId, role: 'distributor' });
    if (!distributor) {
      return NextResponse.json({
        success: false,
        message: 'Distributor not found'
      }, { status: 404 });
    }

    // Create allotment
    const allotment = await Allotment.create({
      product: productId,
      distributor: distributorId,
      quantity: parseInt(quantity),
      allottedBy: decoded.userId,
      notes: notes?.trim(),
      status: 'pending',
    });

    // Reduce product quantity
    product.quantity -= parseInt(quantity);
    await product.save();

    // Populate the response
    const populatedAllotment = await Allotment.findById(allotment._id)
      .populate('product', 'name')
      .populate('distributor', 'name email')
      .populate('allottedBy', 'name');

    return NextResponse.json({
      success: true,
      message: 'Product allotted successfully',
      allotment: {
        id: populatedAllotment._id,
        product: {
          id: populatedAllotment.product._id,
          name: populatedAllotment.product.name,
        },
        distributor: {
          id: populatedAllotment.distributor._id,
          name: populatedAllotment.distributor.name,
          email: populatedAllotment.distributor.email,
        },
        quantity: populatedAllotment.quantity,
        status: populatedAllotment.status,
        notes: populatedAllotment.notes,
        createdAt: populatedAllotment.createdAt,
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Create allotment error:', error);
    return NextResponse.json({
      success: false,
      message: 'An error occurred while creating the allotment',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
