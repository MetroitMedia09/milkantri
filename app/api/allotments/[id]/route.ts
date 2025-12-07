import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import Allotment from '@/models/Allotment';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

// PATCH - Update allotment status
export async function PATCH(
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

    // Get user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    // Validate status
    if (!status || !['pending', 'collected'].includes(status)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid status. Must be "pending" or "collected"'
      }, { status: 400 });
    }

    // Find allotment
    const allotment = await Allotment.findById(id);

    if (!allotment) {
      return NextResponse.json({
        success: false,
        message: 'Allotment not found'
      }, { status: 404 });
    }

    // Check authorization - distributors can only update their own allotments
    if (user.role === 'distributor' && allotment.distributor.toString() !== decoded.userId) {
      return NextResponse.json({
        success: false,
        message: 'Forbidden - You can only update your own allotments'
      }, { status: 403 });
    }

    // Update status
    allotment.status = status;
    await allotment.save();

    return NextResponse.json({
      success: true,
      message: 'Allotment status updated successfully',
      allotment: {
        id: allotment._id,
        status: allotment.status,
      }
    });
  } catch (error) {
    console.error('Update allotment status error:', error);
    return NextResponse.json({
      success: false,
      message: 'An error occurred while updating allotment status',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
