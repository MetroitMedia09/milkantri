import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import Allotment from '@/models/Allotment';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

// GET allotments for the logged-in distributor
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

    // Verify user is a distributor
    const user = await User.findById(decoded.userId);
    if (!user || user.role !== 'distributor') {
      return NextResponse.json({
        success: false,
        message: 'Forbidden - Distributor access only'
      }, { status: 403 });
    }

    // Get allotments for this distributor
    const allotments = await Allotment.find({ distributor: decoded.userId })
      .populate('product', 'name')
      .populate('allottedBy', 'name')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      allotments: allotments.map(allot => ({
        id: allot._id,
        product: {
          id: (allot.product as any)._id,
          name: (allot.product as any).name,
        },
        quantity: allot.quantity,
        status: allot.status,
        notes: allot.notes,
        allottedBy: {
          id: (allot.allottedBy as any)._id,
          name: (allot.allottedBy as any).name,
        },
        createdAt: allot.createdAt,
      }))
    });
  } catch (error) {
    console.error('Fetch distributor allotments error:', error);
    return NextResponse.json({
      success: false,
      message: 'An error occurred while fetching allotments',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
