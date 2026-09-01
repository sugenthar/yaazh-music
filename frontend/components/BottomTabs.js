import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons, Foundation, MaterialCommunityIcons } from '@expo/vector-icons';

const BottomTabs = ({ activeTab, onTabChange }) => {
    return (
        <View style={styles.container}>

            {/* Home */}
            <TouchableOpacity onPress={() => onTabChange('Home')} style={styles.tab}>
                {activeTab === 'Home' ? (
                    <Foundation name="home" size={26} color="#fff" />
                ) : (
                    <Ionicons name="home-outline" size={26} color="#B3B3B3" />
                )}
                <Text style={[styles.label, activeTab === 'Home' && styles.activeLabel]}>
                    Home
                </Text>
            </TouchableOpacity>

            {/* Search */}
            <TouchableOpacity onPress={() => onTabChange('Search')} style={styles.tab}>
                <Ionicons
                    name={activeTab === 'Search' ? 'search' : 'search-outline'}
                    size={26}
                    color={activeTab === 'Search' ? '#fff' : '#B3B3B3'}
                />
                <Text style={[styles.label, activeTab === 'Search' && styles.activeLabel]}>
                    Search
                </Text>
            </TouchableOpacity>

            {/* Library */}
            <TouchableOpacity onPress={() => onTabChange('Library')} style={styles.tab}>
                <MaterialCommunityIcons
                    name={activeTab === 'Library' ? 'playlist-music' : 'playlist-music-outline'}
                    size={26}
                    color={activeTab === 'Library' ? '#fff' : '#B3B3B3'}
                />
                <Text style={[styles.label, activeTab === 'Library' && styles.activeLabel]}>
                    Your Library
                </Text>
            </TouchableOpacity>

            {/* Premium */}
            <TouchableOpacity onPress={() => onTabChange('Premium')} style={styles.tab}>
                <MaterialCommunityIcons
                    name="emoticon-happy-outline"
                    size={26}
                    color={activeTab === 'Premium' ? '#fff' : '#B3B3B3'}
                />
                <Text style={[styles.label, activeTab === 'Premium' && styles.activeLabel]}>
                    Moods
                </Text>
            </TouchableOpacity>

        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        height: 65,
        backgroundColor: '#121212',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingBottom: 15,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 5,
    },
    label: {
        fontSize: 10,
        marginTop: 4,
        color: '#B3B3B3',
        fontWeight: '500',
    },
    activeLabel: {
        color: '#fff',
    },
});

export default BottomTabs;
