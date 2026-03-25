import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { decodeDeckCode, isValidDeckCode } from '@/lib/deckcode/decoder';
import { SavedDeck } from '@/lib/subscription';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user document from Firestore
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return NextResponse.json({
        success: true,
        decks: [],
      });
    }

    const userData = userDoc.data();
    const savedDecks = userData.savedDecks || [];

    return NextResponse.json({
      success: true,
      decks: savedDecks,
    });
  } catch (error) {
    console.error('Error fetching saved decks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch saved decks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, deckCode, deckName } = await request.json();

    if (!userId || !deckCode) {
      return NextResponse.json(
        { error: 'User ID and deck code are required' },
        { status: 400 }
      );
    }

    // Validate the deck code
    if (!isValidDeckCode(deckCode)) {
      return NextResponse.json(
        { error: 'Invalid deck code' },
        { status: 400 }
      );
    }

    const decodedDeck = decodeDeckCode(deckCode);

    // Get user document
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    let currentDecks = [];
    if (userDoc.exists()) {
      const userData = userDoc.data();
      currentDecks = userData.savedDecks || [];
    }

    // Check if user has reached the limit of 20 decks
    if (currentDecks.length >= 20) {
      return NextResponse.json(
        {
          error: 'Deck limit reached',
          message: 'You have reached the maximum limit of 20 saved decks. Please delete an existing deck to make space.',
          limitReached: true
        },
        { status: 400 }
      );
    }

    // Check if deck already exists
    const existingDeck = currentDecks.find((deck: any) => deck.deckCode === deckCode);
    if (existingDeck) {
      return NextResponse.json(
        {
          error: 'Deck already saved',
          message: 'This deck is already in your collection.'
        },
        { status: 400 }
      );
    }

    // Create new deck object
    const newDeck: SavedDeck = {
      id: `deck_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      deckCode,
      name: deckName || `Deck ${deckCode.slice(0, 8)}`,
      className: 'Unknown', // TODO: Add class detection from decodedDeck
      formatName: 'Unknown', // TODO: Add format detection from decodedDeck
      totalCards: decodedDeck?.cards?.reduce((sum, [, count]) => sum + count, 0) || 0,
      savedAt: Date.now(),
    };

    // Add deck to user's saved decks
    if (userDoc.exists()) {
      await updateDoc(userRef, {
        savedDecks: arrayUnion(newDeck),
        updatedAt: Date.now(),
      });
    } else {
      // Create new user document with the deck
      await setDoc(userRef, {
        userId,
        savedDecks: [newDeck],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }, { merge: true });
    }

    return NextResponse.json({
      success: true,
      message: 'Deck saved successfully!',
      deck: newDeck,
    });
  } catch (error) {
    console.error('Error saving deck:', error);
    return NextResponse.json(
      { error: 'Failed to save deck' },
      { status: 500 }
    );
  }
}
