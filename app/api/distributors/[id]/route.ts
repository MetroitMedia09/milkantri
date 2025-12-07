import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET!;

// DELETE distributor
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

    // Check if user is admin
    const user = await User.findById(decoded.userId);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({
        success: false,
        message: 'Forbidden - Admin access required'
      }, { status: 403 });
    }

    const { id } = await params;

    // Delete distributor (only if role is distributor)
    const distributor = await User.findOneAndDelete({
      _id: id,
      role: 'distributor'
    });

    if (!distributor) {
      return NextResponse.json({
        success: false,
        message: 'Distributor not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Distributor deleted successfully',
    });
  } catch (error) {
    console.error('Delete distributor error:', error);
    return NextResponse.json({
      success: false,
      message: 'An error occurred while deleting the distributor',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT - Update distributor
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

    // Check if user is admin
    const user = await User.findById(decoded.userId);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({
        success: false,
        message: 'Forbidden - Admin access required'
      }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, email, password, phoneNumber, isActive } = body;

    // Validate input
    if (!name || !email) {
      return NextResponse.json({
        success: false,
        message: 'Name and email are required'
      }, { status: 400 });
    }

    // Check if email already exists for another user
    const existingUser = await User.findOne({
      email: email.toLowerCase().trim(),
      _id: { $ne: id }
    });
    if (existingUser) {
      return NextResponse.json({
        success: false,
        message: 'Email already exists'
      }, { status: 400 });
    }

    const updateData: any = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phoneNumber: phoneNumber?.trim(),
      isActive: isActive !== undefined ? isActive : true,
    };

    // Only update password if provided
    if (password && password.trim()) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Update distributor
    const distributor = await User.findOneAndUpdate(
      { _id: id, role: 'distributor' },
      updateData,
      { new: true, runValidators: true }
    );

    if (!distributor) {
      return NextResponse.json({
        success: false,
        message: 'Distributor not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Distributor updated successfully',
      distributor: {
        id: distributor._id,
        name: distributor.name,
        email: distributor.email,
        phoneNumber: distributor.phoneNumber,
        isActive: distributor.isActive,
        updatedAt: distributor.updatedAt,
      }
    });
  } catch (error) {
    console.error('Update distributor error:', error);
    return NextResponse.json({
      success: false,
      message: 'An error occurred while updating the distributor',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET single distributor
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

    // Find distributor
    const distributor = await User.findOne({
      _id: id,
      role: 'distributor'
    }).select('-password');

    if (!distributor) {
      return NextResponse.json({
        success: false,
        message: 'Distributor not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      distributor: {
        id: distributor._id,
        name: distributor.name,
        email: distributor.email,
        phoneNumber: distributor.phoneNumber,
        isActive: distributor.isActive,
        createdAt: distributor.createdAt,
        updatedAt: distributor.updatedAt,
      }
    });
  } catch (error) {
    console.error('Fetch distributor error:', error);
    return NextResponse.json({
      success: false,
      message: 'An error occurred while fetching the distributor',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
