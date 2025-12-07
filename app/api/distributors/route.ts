import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

// GET all distributors
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

    // Check if user is admin
    const user = await User.findById(decoded.userId);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({
        success: false,
        message: 'Forbidden - Admin access required'
      }, { status: 403 });
    }

    // Get all distributors
    const distributors = await User.find({ role: 'distributor' })
      .select('-password')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      distributors: distributors.map(dist => ({
        id: dist._id,
        name: dist.name,
        email: dist.email,
        phoneNumber: dist.phoneNumber,
        isActive: dist.isActive,
        createdAt: dist.createdAt,
      }))
    });
  } catch (error) {
    console.error('Fetch distributors error:', error);
    return NextResponse.json({
      success: false,
      message: 'An error occurred while fetching distributors',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST - Create new distributor
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
    const { name, email, password, phoneNumber } = body;

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json({
        success: false,
        message: 'Name, email, and password are required'
      }, { status: 400 });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({
        success: false,
        message: 'Email already exists'
      }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create distributor
    const distributor = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      phoneNumber: phoneNumber?.trim(),
      role: 'distributor',
      isActive: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Distributor created successfully',
      distributor: {
        id: distributor._id,
        name: distributor.name,
        email: distributor.email,
        phoneNumber: distributor.phoneNumber,
        isActive: distributor.isActive,
        createdAt: distributor.createdAt,
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Create distributor error:', error);
    return NextResponse.json({
      success: false,
      message: 'An error occurred while creating the distributor',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
