import mongoose, { Document, Schema } from 'mongoose';

export interface IAllotment extends Document {
  product: mongoose.Types.ObjectId;
  distributor: mongoose.Types.ObjectId;
  quantity: number;
  allottedBy: mongoose.Types.ObjectId;
  status: 'pending' | 'collected' | 'returned';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AllotmentSchema = new Schema<IAllotment>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    distributor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    allottedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'collected', 'returned'],
      default: 'pending',
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
AllotmentSchema.index({ distributor: 1, createdAt: -1 });
AllotmentSchema.index({ product: 1 });

const Allotment = mongoose.models.Allotment || mongoose.model<IAllotment>('Allotment', AllotmentSchema);

export default Allotment;
