import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';

const JWT_SECRET = process.env.JWT_SECRET!;

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
    try {
      jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized - Invalid token'
      }, { status: 401 });
    }

    // Fetch all products, sorted by newest first
    const products = await Product.find()
      .sort({ createdAt: -1 })
      .select('name quantity dailyQuantity createdAt updatedAt');

    return NextResponse.json({
      success: true,
      products: products.map(p => ({
        id: p._id,
        name: p.name,
        quantity: p.quantity,
        dailyQuantity: p.dailyQuantity,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
      total: products.length,
    });
  } catch (error) {
    console.error('Fetch products error:', error);
    return NextResponse.json({
      success: false,
      message: 'An error occurred while fetching products',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
