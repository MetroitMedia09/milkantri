import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import Allotment from '@/models/Allotment';
import Product from '@/models/Product';
import Distribution from '@/models/Distribution';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

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

    // Get counts before deletion
    const allotments = await Allotment.find();
    const distributions = await Distribution.find();

    // Reset all product quantities to 0
    const resetResult = await Product.updateMany({}, { quantity: 0 });

    // Delete all allotments
    const deletedAllotmentsResult = await Allotment.deleteMany({});

    // Delete all distributions
    const deletedDistributionsResult = await Distribution.deleteMany({});

    return NextResponse.json({
      success: true,
      message: 'Inventory reset successfully',
      restoredProducts: resetResult.modifiedCount || 0,
      deletedAllotments: deletedAllotmentsResult.deletedCount || allotments.length,
      deletedDistributions: deletedDistributionsResult.deletedCount || distributions.length
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
