import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

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
    const { name, quantity } = body;

    // Validate input
    if (!name || quantity === undefined) {
      return NextResponse.json({
        success: false,
        message: 'Product name and quantity are required'
      }, { status: 400 });
    }

    if (quantity < 0) {
      return NextResponse.json({
        success: false,
        message: 'Quantity cannot be negative'
      }, { status: 400 });
    }

    // Create product
    const product = await Product.create({
      name: name.trim(),
      quantity: parseInt(quantity),
      dailyQuantity: parseInt(quantity),
      createdBy: user._id,
    });

    return NextResponse.json({
      success: true,
      message: 'Product created successfully',
      product: {
        id: product._id,
        name: product.name,
        quantity: product.quantity,
        createdAt: product.createdAt,
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json({
      success: false,
      message: 'An error occurred while creating the product',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
