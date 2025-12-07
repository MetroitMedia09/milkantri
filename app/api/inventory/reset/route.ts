import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import Allotment from '@/models/Allotment';
import Product from '@/models/Product';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET!;

// POST - Reset daily inventory
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

    // Get all allotments
    const allotments = await Allotment.find();

    // Get all products and reset them to their daily quantities
    const products = await Product.find();
    let restoredCount = 0;

    for (const product of products) {
      await Product.findByIdAndUpdate(product._id, {
        quantity: product.dailyQuantity
      });
      restoredCount++;
    }

    // Delete all allotments
    const deletedResult = await Allotment.deleteMany({});

    return NextResponse.json({
      success: true,
      message: 'Inventory reset successfully',
      restoredProducts: restoredCount,
      deletedAllotments: deletedResult.deletedCount || allotments.length
    });
  } catch (error) {
    console.error('Reset inventory error:', error);
    return NextResponse.json({
      success: false,
      message: 'An error occurred while resetting inventory',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
