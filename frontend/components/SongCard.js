import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Spotify Grid Calculation
// Screen Padding: 16px (Left) + 16px (Right) = 32px
// Middle Gap: 8px
// Item Width = (Screen Width - 32px - 8px) / 2
const GRID_ITEM_WIDTH = (width - 32 - 8) / 2;

const SongCard = ({ song, variant = 'row', isPlaying, onPlay, onMenu }) => {

    // 0. GENRE CARD (For Search Page)
    if (variant === 'genre') {
        return (
            <TouchableOpacity activeOpacity={0.9} style={[styles.genreContainer, { backgroundColor: song.color || '#E13300' }]}>
                <Text style={styles.genreTitle}>{song.title}</Text>
                <Image source={{ uri: song.artwork }} style={styles.genreImage} />
            </TouchableOpacity>
        );
    }

    // 1. SPOTIFY "GOOD MORNING" SHORTCUT (2-Column Grid)
    if (variant === 'shortcut') {
        return (
            <TouchableOpacity onPress={onPlay} activeOpacity={0.9} style={styles.shortcutContainer}>
                <Image source={{ uri: song.artwork }} style={styles.shortcutImage} />
                <View style={styles.shortcutTextContainer}>
                    <Text style={[styles.shortcutTitle, isPlaying && styles.activeText]} numberOfLines={2}>
                        {song.title}
                    </Text>
                </View>
                {isPlaying && (
                    <View style={styles.playingIndicator}>
                        <Ionicons name="stats-chart" size={12} color="#1DB954" />
                    </View>
                )}
            </TouchableOpacity>
        );
    }

    // 2. BIG SQUARE CARD (Horizontal Scroll)
    if (variant === 'card') {
        return (
            <TouchableOpacity onPress={onPlay} activeOpacity={0.8} style={styles.cardContainer}>
                <Image source={{ uri: song.artwork }} style={styles.cardInfoArtwork} />
                <View style={styles.cardApiContent}>
                    <Text style={[styles.cardTitle, isPlaying && styles.activeText]} numberOfLines={1}>{song.title}</Text>
                    <Text style={styles.cardArtist} numberOfLines={1}>Song • {song.artist}</Text>
                </View>
            </TouchableOpacity>
        );
    }

    // 3. VERTICAL LIST ROW
    return (
        <TouchableOpacity onPress={onPlay} activeOpacity={0.7} style={styles.rowContainer}>
            <Image source={{ uri: song.artwork }} style={styles.rowArtwork} />
            <View style={styles.rowInfo}>
                <Text style={[styles.rowTitle, isPlaying && styles.activeText]} numberOfLines={1}>{song.title}</Text>
                <View style={styles.rowMeta}>
                    {/* Lyrics Badge Mock */}
                    <View style={styles.lyricsBadge}><Text style={styles.lyricsText}>LYRICS</Text></View>
                    <Text style={styles.rowArtist} numberOfLines={1}>{song.artist}</Text>
                </View>
            </View>
            <TouchableOpacity onPress={onMenu} style={styles.menuButton}>
                <Ionicons name="ellipsis-vertical" size={18} color="#B3B3B3" />
            </TouchableOpacity>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    // Utils
    activeText: { color: '#1DB954' },

    // --- GENRE ---
    genreContainer: {
        width: (width - 32 - 12) / 2, // 2 columns
        height: 90,
        borderRadius: 4,
        marginBottom: 12,
        overflow: 'hidden',
        padding: 10,
        position: 'relative',
    },
    genreTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        maxWidth: '80%',
    },
    genreImage: {
        width: 65,
        height: 65,
        position: 'absolute',
        bottom: 0,
        right: -10, // Rotated offset look
        transform: [{ rotate: '25deg' }],
        borderRadius: 4,
    },

    // --- SHORTCUT ---
    shortcutContainer: {
        flexDirection: 'row',
        backgroundColor: '#2A2A2A',
        width: GRID_ITEM_WIDTH,
        height: 56, // Fixed height for uniformity
        borderRadius: 4,
        marginBottom: 8,
        // marginRight: 8, // Handled by parent container flex
        alignItems: 'center',
        overflow: 'hidden',
    },
    shortcutImage: {
        width: 56,
        height: 56,
    },
    shortcutTextContainer: {
        flex: 1,
        paddingHorizontal: 8,
        justifyContent: 'center',
    },
    shortcutTitle: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
        lineHeight: 16,
    },
    playingIndicator: {
        marginRight: 8,
    },

    // --- BIG CARD ---
    cardContainer: {
        width: 150,
        marginRight: 16,
    },
    cardInfoArtwork: {
        width: 150,
        height: 150,
        borderRadius: 8, // Slightly rounded? Spotify is often square, but recent design prefers slight curves or square
        marginBottom: 8,
        backgroundColor: '#333',
    },
    cardApiContent: {
        alignItems: 'flex-start',
    },
    cardTitle: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
        marginTop: 4,
        marginBottom: 2,
    },
    cardArtist: {
        color: '#B3B3B3',
        fontSize: 12,
        fontWeight: '500',
    },

    // --- ROW ---
    rowContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        width: '100%',
    },
    rowArtwork: {
        width: 48,
        height: 48,
        borderRadius: 4,
        marginRight: 12,
        backgroundColor: '#333',
    },
    rowInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    rowTitle: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '500',
        marginBottom: 4,
    },
    rowMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    lyricsBadge: {
        backgroundColor: '#B3B3B3',
        paddingHorizontal: 3,
        borderRadius: 2,
        marginRight: 6,
        height: 12,
        justifyContent: 'center',
    },
    lyricsText: {
        color: '#000',
        fontSize: 8,
        fontWeight: '900',
    },
    rowArtist: {
        color: '#B3B3B3',
        fontSize: 12,
    },
    menuButton: {
        padding: 8,
    }
});

export default SongCard;
