import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  try {
    const { deckId } = await params;
    const { userId } = await request.json();

    if (!userId || !deckId) {
      return NextResponse.json(
        { error: 'User ID and deck ID are required' },
        { status: 400 }
      );
    }

    // Get user document
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const currentDecks = userData.savedDecks || [];

    // Find and remove the deck
    const updatedDecks = currentDecks.filter((deck: any) => deck.id !== deckId);

    if (updatedDecks.length === currentDecks.length) {
      return NextResponse.json(
        { error: 'Deck not found' },
        { status: 404 }
      );
    }

    // Update user document
    await updateDoc(userRef, {
      savedDecks: updatedDecks,
      updatedAt: Date.now(),
    });

    return NextResponse.json({
      success: true,
      message: 'Deck deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting deck:', error);
    return NextResponse.json(
      { error: 'Failed to delete deck' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  try {
    const { deckId } = await params;
    const { userId, deckName } = await request.json();

    if (!userId || !deckId || !deckName) {
      return NextResponse.json(
        { error: 'User ID, deck ID, and deck name are required' },
        { status: 400 }
      );
    }

    // Validate deck name
    const trimmedName = deckName.trim();
    if (trimmedName.length === 0) {
      return NextResponse.json(
        { error: 'Deck name cannot be empty' },
        { status: 400 }
      );
    }

    if (trimmedName.length > 100) {
      return NextResponse.json(
        { error: 'Deck name cannot exceed 100 characters' },
        { status: 400 }
      );
    }

    // Get user document
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const currentDecks = userData.savedDecks || [];

    // Find the deck to update
    const deckIndex = currentDecks.findIndex((deck: any) => deck.id === deckId);

    if (deckIndex === -1) {
      return NextResponse.json(
        { error: 'Deck not found' },
        { status: 404 }
      );
    }

    // Update the deck name
    const updatedDecks = [...currentDecks];
    updatedDecks[deckIndex] = {
      ...updatedDecks[deckIndex],
      name: trimmedName,
    };

    // Update user document
    await updateDoc(userRef, {
      savedDecks: updatedDecks,
      updatedAt: Date.now(),
    });

    return NextResponse.json({
      success: true,
      message: 'Deck name updated successfully',
      deck: updatedDecks[deckIndex],
    });
  } catch (error) {
    console.error('Error updating deck name:', error);
    return NextResponse.json(
      { error: 'Failed to update deck name' },
      { status: 500 }
    );
  }
}
