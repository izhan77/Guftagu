import React, { useState, useRef } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

const CHARACTERS = [
  {
    id: "zara",
    name: "Zara",
    tagline: "Roasts, laughs & real talk. You in?",
    badge: "Creative & Fun",
    badgeColor: "#7C5CBF",
    gradientTop: "#F4EDFF",
    gradientBottom: "#E0D4FF",
    buttonColor: "#7C5CBF",
    image: require("../../../assets/characters/zara.png"),
  },
  {
    id: "robo",
    name: "Robo Bhaya",
    tagline: "BEEP BOOP! Let's build a volcano!",
    badge: "Science & Puzzles",
    badgeColor: "#2196F3",
    gradientTop: "#E8F4FD",
    gradientBottom: "#BBDEFB",
    buttonColor: "#2196F3",
    image: require("../../../assets/characters/robo_bhaya.png"),
  },
  {
    id: "ustad",
    name: "Ustad Sahab",
    tagline: "Your voice matters. Let's shape it together!",
    badge: "Wise & Funny",
    badgeColor: "#4CAF50",
    gradientTop: "#EAF7EE",
    gradientBottom: "#C8E6C9",
    buttonColor: "#4CAF50",
    image: require("../../../assets/characters/ustad_sahab.png"),
  },
];

export default function CharacterSelectScreen({ navigation, route }: any) {
  const {
    name: childName = "Buddy",
    ageGroup = "10-14",
    coppaRequired,
  } = route.params || {};

  const [index, setIndex] = useState(0);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate("NameInput", {
      ageGroup,
      initialName: typeof childName === "string" ? childName : undefined,
      ...(typeof coppaRequired === "boolean" ? { coppaRequired } : {}),
    });
  };

  // Animation Refs
  const slideAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const current = CHARACTERS[index];

  // Continuous Floating Animation (The Figma Magic)
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const animateSwitch = (newIndex: number, direction: "left" | "right") => {
    const toValue = direction === "left" ? -width : width;

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIndex(newIndex);
      slideAnim.setValue(-toValue);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15], // Moves up 15 pixels
  });

  return (
    <LinearGradient
      colors={[current.gradientTop, current.gradientBottom]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity
          style={styles.backBtnContainer}
          onPress={handleBack}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hey {childName}! 👋</Text>
          <Text style={styles.title}>Who's your speaking buddy?</Text>
        </View>

        {/* Character Stage (The 3D Experience) */}
        <View style={styles.characterStage}>
          <View style={styles.watermarkWrapper} pointerEvents="none">
            <Animated.Text style={[styles.watermark, { opacity: fadeAnim }]}>
              {current.name.toUpperCase()}
            </Animated.Text>
          </View>

          <View style={styles.stageContent}>
            {/* Left Nav */}
            <TouchableOpacity
              onPress={() => index > 0 && animateSwitch(index - 1, "right")}
              style={[styles.navBtn, index === 0 && { opacity: 0 }]}
            >
              <Ionicons name="chevron-back" size={32} color="#2D2D2D" />
            </TouchableOpacity>

            <View style={styles.imageContainer}>
              <Animated.View
                style={[
                  styles.characterWrapper,
                  {
                    transform: [
                      { translateX: slideAnim },
                      { translateY: translateY },
                    ],
                    opacity: fadeAnim,
                  },
                ]}
              >
                <Image
                  source={current.image}
                  style={styles.charImage}
                  resizeMode="contain"
                />
              </Animated.View>

              <LinearGradient
                colors={[
                  "transparent",
                  "rgba(255,255,255,0.2)",
                  current.gradientBottom,
                ]}
                style={styles.bottomMask}
                locations={[0, 0.4, 0.85]}
                pointerEvents="none"
              />
            </View>

            {/* Right Nav */}
            <TouchableOpacity
              onPress={() =>
                index < CHARACTERS.length - 1 &&
                animateSwitch(index + 1, "left")
              }
              style={[
                styles.navBtn,
                index === CHARACTERS.length - 1 && { opacity: 0 },
              ]}
            >
              <Ionicons name="chevron-forward" size={32} color="#2D2D2D" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Floating Island Card */}
        <View style={styles.infoCard}>
          <View
            style={[
              styles.badge,
              { backgroundColor: current.badgeColor + "15" },
            ]}
          >
            <Text style={[styles.badgeText, { color: current.badgeColor }]}>
              ⭐ {current.badge}
            </Text>
          </View>

          <Text style={styles.charName}>{current.name}</Text>
          <Text style={styles.charTagline}>{current.tagline}</Text>

          {/* Morphing Dots */}
          <View style={styles.dotContainer}>
            {CHARACTERS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === index
                    ? { width: 25, backgroundColor: current.buttonColor }
                    : { width: 8, backgroundColor: "#DDD" },
                ]}
              />
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.mainButton,
              { backgroundColor: current.buttonColor },
            ]}
            onPress={() =>
              navigation.navigate("Session", {
                name: childName,
                ageGroup,
                character: current,
              })
            }
          >
            <Text style={styles.buttonText}>Choose {current.name}!</Text>
            <Ionicons name="arrow-forward" size={22} color="white" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtnContainer: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: "#7C5CBF",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 25,
    zIndex: 100,
    elevation: 8,
    shadowColor: "#7C5CBF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  safe: { flex: 1, paddingHorizontal: 20 },
  header: { alignItems: "center", marginTop: 10, zIndex: 10 },
  greeting: { fontSize: 26, fontFamily: "Poppins-ExtraBold", color: "#000000" },
  title: {
    fontSize: 16,
    fontFamily: "Poppins-ExtraBold",
    color: "#2D2D2D",
    textAlign: "center",
  },
  characterStage: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  watermarkWrapper: {
    position: "absolute",
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    top: "20%",
    zIndex: 0,
  },
  watermark: {
    fontSize: 70,
    fontFamily: "Poppins-ExtraBold",
    color: "rgba(0,0,0,0.1)",
    textAlign: "center",
  },

  stageContent: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    justifyContent: "space-between",
    zIndex: 20,
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowOpacity: 0.1,
  },

  imageContainer: {
    width: width * 0.6,
    height: height * 0.35,
    justifyContent: "flex-end",
    alignItems: "center",
    overflow: "visible",
  },
  characterWrapper: {
    width: "100%",
    height: "100%",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  charImage: {
    width: "120%",
    height: "100%",
  },

  bottomMask: {
    position: "absolute",
    bottom: -2,
    width: "180%",
    height: 170,
    zIndex: 4,
    borderRadius: 60,
  },

  infoCard: {
    backgroundColor: "white",
    borderRadius: 30,
    padding: 24,
    alignItems: "center",
    marginBottom: 50,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
  },
  badgeText: { fontSize: 12, fontFamily: "Poppins-Bold" },
  charName: { fontSize: 30, fontFamily: "Poppins-ExtraBold", color: "#2D2D2D" },
  charTagline: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#8A8A8A",
    textAlign: "center",
    marginBottom: 12,
  },
  dotContainer: { flexDirection: "row", gap: 6, marginBottom: 15 },
  dot: { height: 8, borderRadius: 4 },
  mainButton: {
    width: "100%",
    height: 60,
    borderRadius: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  buttonText: { color: "white", fontSize: 18, fontFamily: "Poppins-Bold" },
});
