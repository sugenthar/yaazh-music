import React from 'react';
import {
    StyleSheet,
    Text,
    View,
    Image,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const BottomPlayer = ({ song, isPlaying, onTogglePlay, onPlayNext, onPlayPrevious, progress = 0, onPress }) => {
    if (!song) return null;

    return (
        <View style={styles.outerContainer}>
            <TouchableOpacity activeOpacity={0.95} style={styles.container} onPress={onPress}>

                {/* MAIN ROW */}
                <View style={styles.contentContainer}>
                    <Image source={{ uri: song.artwork }} style={styles.artwork} />

                    {/* SONG INFO */}
                    <View style={styles.info}>
                        <View style={styles.textWrapper}>
                            <Text style={styles.title} numberOfLines={1}>
                                {song.title}
                            </Text>
                            <Text style={styles.dot}>•</Text>
                            <Text style={styles.artist} numberOfLines={1}>
                                {song.artist}
                            </Text>
                        </View>

                        <View style={styles.deviceRow}>
                            <Ionicons name="bluetooth" size={10} color="#1DB954" />
                            <Text style={styles.deviceText}>AirPods Pro</Text>
                        </View>
                    </View>

                    {/* CONTROLS */}
                    <View style={styles.controls}>
                        <TouchableOpacity onPress={onPlayPrevious} style={styles.iconBtn}>
                            <Ionicons name="play-skip-back" size={22} color="#fff" />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={onTogglePlay} style={styles.iconBtn}>
                            <Ionicons
                                name={isPlaying ? 'pause' : 'play'}
                                size={28}
                                color="#fff"
                            />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={onPlayNext} style={styles.iconBtn}>
                            <Ionicons name="play-skip-forward" size={22} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* PROGRESS BAR */}
                <View style={styles.progressBarBackground}>
                    <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                </View>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    outerContainer: {
        position: 'absolute',
        bottom: 60, // stays above BottomTabs
        width: width * 0.94,
        left: width * 0.03,
        borderRadius: 6,
        zIndex: 100,
    },

    container: {
        backgroundColor: '#382e2c',
        borderRadius: 6,
        overflow: 'hidden',
        elevation: 6,
    },

    contentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 8,
    },

    artwork: {
        width: 38,
        height: 38,
        borderRadius: 4,
        marginRight: 12,
        backgroundColor: '#282828',
    },

    info: {
        flex: 1,
        justifyContent: 'center',
    },

    textWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    title: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
        maxWidth: '60%',
    },

    dot: {
        color: '#B3B3B3',
        marginHorizontal: 4,
        fontSize: 10,
    },

    artist: {
        color: '#B3B3B3',
        fontSize: 12,
        fontWeight: '500',
        maxWidth: '35%',
    },

    deviceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },

    deviceText: {
        color: '#1DB954',
        fontSize: 10,
        marginLeft: 4,
    },

    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
    },

    iconBtn: {
        marginLeft: 12,
    },

    progressBarBackground: {
        height: 2,
        backgroundColor: 'rgba(255,255,255,0.2)',
        width: '96%',
        alignSelf: 'center',
        marginBottom: 3,
        borderRadius: 2,
    },

    progressFill: {
        width: '0%', // Default to 0, overridden by inline style
        height: '100%',
        backgroundColor: '#fff',
        borderRadius: 2,
    },
});

export default BottomPlayer;
