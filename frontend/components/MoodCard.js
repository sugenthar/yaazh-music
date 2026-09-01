import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    SafeAreaView,
    Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

const MOODS = [
    {
        id: '1',
        text: 'Late night music feels different.',
        user: 'ARUN',
        color: '#1DB954',
    },
    {
        id: '2',
        text: 'Some days silence is enough.',
        user: 'MEERA',
        color: '#3D5AFE',
    },
    {
        id: '3',
        text: 'Rain, headphones, peace.',
        user: 'KARTHIK',
        color: '#FF7043',
    },
];

export default function MoodPage() {
    const [activeMood, setActiveMood] = useState(null);

    const renderCircle = ({ item }) => (
        <TouchableOpacity
            style={[styles.circle, { backgroundColor: item.color }]}
            onPress={() => setActiveMood(item)}
            activeOpacity={0.8}
        >
            <Text style={styles.circleText}>{item.user[0]}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* HEADER */}
            <Text style={styles.title}>Mood</Text>

            {/* CIRCLE ROW */}
            <FlatList
                data={MOODS}
                horizontal
                keyExtractor={(item) => item.id}
                renderItem={renderCircle}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.circleList}
            />

            {/* EXPANDED BOX */}
            {activeMood && (
                <View style={styles.moodBox}>
                    <Text style={styles.moodText}>{activeMood.text}</Text>

                    <Text style={styles.userText}>{activeMood.user}</Text>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
        paddingHorizontal: 16,
    },

    title: {
        fontSize: 26,
        fontWeight: '700',
        color: '#fff',
        marginVertical: 16,
    },

    /* CIRCLES */
    circleList: {
        paddingBottom: 20,
    },

    circle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },

    circleText: {
        color: '#000',
        fontSize: 18,
        fontWeight: '700',
    },

    /* BOX */
    moodBox: {
        marginTop: 20,
        backgroundColor: '#1a1a1a',
        borderRadius: 18,
        padding: 18,
        width: width - 32,
    },

    moodText: {
        color: '#fff',
        fontSize: 17,
        lineHeight: 25,
    },

    userText: {
        marginTop: 14,
        color: 'rgba(255,255,255,0.4)',
        fontSize: 11,
        letterSpacing: 1,
    },
});
