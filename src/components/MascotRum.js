import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, TouchableWithoutFeedback } from 'react-native';
import Svg, { Path, Rect, Circle, Ellipse, G, Text as SvgText } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  runOnJS,
  Easing
} from 'react-native-reanimated';
import { useTheme } from './ThemeContext';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

export default function MascotRum({ state = 'idle', width = 180, height = 120, onBarkComplete }) {
  const { colors } = useTheme();

  // Reanimated shared values
  const bodyY = useSharedValue(0);
  const headRot = useSharedValue(0);
  const headY = useSharedValue(0);
  const earRot = useSharedValue(0);
  const tailRot = useSharedValue(0);
  const legFrontRot = useSharedValue(0);
  const legBackRot = useSharedValue(0);
  const z1Alpha = useSharedValue(0);
  const z1Y = useSharedValue(0);
  const z2Alpha = useSharedValue(0);
  const z2Y = useSharedValue(0);
  const flip = useSharedValue(0);
  const isFlipping = useRef(false);

  useEffect(() => {
    // Reset all animations
    bodyY.value = 0;
    headRot.value = 0;
    headY.value = 0;
    earRot.value = 0;
    tailRot.value = 0;
    legFrontRot.value = 0;
    legBackRot.value = 0;
    z1Alpha.value = 0;
    z1Y.value = 0;
    z2Alpha.value = 0;
    z2Y.value = 0;

    if (state === 'sleeping') {
      // Slow breathing
      bodyY.value = withRepeat(withTiming(2, { duration: 1500, easing: Easing.inOut(Easing.ease) }), -1, true);
      headY.value = withRepeat(withTiming(13.5, { duration: 1500, easing: Easing.inOut(Easing.ease) }), -1, true);
      headRot.value = 10; // head rests down
      earRot.value = 5;
      tailRot.value = 40;
      legFrontRot.value = 70; // legs flat
      legBackRot.value = 70;

      // Float Z's
      z1Alpha.value = withRepeat(withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0, { duration: 1000 })
      ), -1, false);
      z1Y.value = withRepeat(withTiming(-30, { duration: 2000, easing: Easing.linear }), -1, false);

      setTimeout(() => {
        z2Alpha.value = withRepeat(withSequence(
          withTiming(1, { duration: 1000 }),
          withTiming(0, { duration: 1000 })
        ), -1, false);
        z2Y.value = withRepeat(withTiming(-30, { duration: 2000, easing: Easing.linear }), -1, false);
      }, 800);
    } 
    else if (state === 'idle') {
      // Calm breath and slow tail wag
      bodyY.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
      tailRot.value = withRepeat(withTiming(20, { duration: 600 }), -1, true);
      headRot.value = withRepeat(withTiming(2, { duration: 1200 }), -1, true);
    } 
    else if (state === 'running') {
      // Rapid bobbing, fast tail wag and running leg swings
      bodyY.value = withRepeat(withTiming(-4, { duration: 150 }), -1, true);
      headY.value = withRepeat(withTiming(-3, { duration: 150 }), -1, true);
      headRot.value = withRepeat(withTiming(2, { duration: 150 }), -1, true);
      tailRot.value = withRepeat(withTiming(30, { duration: 80 }), -1, true);
      
      // Swing legs in opposite phases
      legFrontRot.value = withRepeat(withSequence(
        withTiming(35, { duration: 150 }),
        withTiming(-35, { duration: 150 })
      ), -1, false);
      
      legBackRot.value = withRepeat(withSequence(
        withTiming(-35, { duration: 150 }),
        withTiming(35, { duration: 150 })
      ), -1, false);
    } 
    else if (state === 'barking') {
      // Barking jitter
      bodyY.value = withRepeat(withTiming(-2, { duration: 100 }), -1, true);
      headRot.value = withRepeat(withTiming(-10, { duration: 100 }), -1, true);
      tailRot.value = withRepeat(withTiming(55, { duration: 60 }), -1, true);
      earRot.value = withRepeat(withTiming(15, { duration: 100 }), -1, true);
    }
  }, [state]);

  // Animated styles
  const animBody = useAnimatedStyle(() => ({
    transform: [{ translateY: bodyY.value }]
  }));

  const animHead = useAnimatedStyle(() => ({
    transform: [
      { translateX: 140 },
      { translateY: 50 + headY.value },
      { rotate: `${headRot.value}deg` },
      { translateX: -140 },
      { translateY: -50 }
    ]
  }));

  const animEar = useAnimatedStyle(() => ({
    transform: [
      { translateX: 140 },
      { translateY: 42 },
      { rotate: `${earRot.value}deg` },
      { translateX: -140 },
      { translateY: -42 }
    ]
  }));

  const animTail = useAnimatedStyle(() => ({
    transform: [
      { translateX: 210 },
      { translateY: 60 },
      { rotate: `${tailRot.value}deg` },
      { translateX: -210 },
      { translateY: -60 }
    ]
  }));

  const animLegFront = useAnimatedStyle(() => ({
    transform: [
      { translateX: 154 },
      { translateY: 80 },
      { rotate: `${legFrontRot.value}deg` },
      { translateX: -154 },
      { translateY: -80 }
    ]
  }));

  const animLegBack = useAnimatedStyle(() => ({
    transform: [
      { translateX: 199 },
      { translateY: 80 },
      { rotate: `${legBackRot.value}deg` },
      { translateX: -199 },
      { translateY: -80 }
    ]
  }));

  const animZ1 = useAnimatedStyle(() => ({
    opacity: z1Alpha.value,
    transform: [{ translateY: z1Y.value }, { translateX: -15 }]
  }));

  const animZ2 = useAnimatedStyle(() => ({
    opacity: z2Alpha.value,
    transform: [{ translateY: z2Y.value }, { translateX: -5 }]
  }));

  const animFlip = useAnimatedStyle(() => ({
    transform: [{ rotate: `${flip.value}deg` }]
  }));

  const triggerFlip = () => {
    if (isFlipping.current) return;
    isFlipping.current = true;
    
    // Play happy bark callback
    if (onBarkComplete) {
      onBarkComplete();
    }
    
    flip.value = withTiming(360, { duration: 800, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }, (finished) => {
      if (finished) {
        flip.value = 0;
        runOnJS(() => { isFlipping.current = false; })();
      }
    });
  };

  return (
    <TouchableWithoutFeedback onPress={triggerFlip}>
      <View style={{ width, height, overflow: 'visible' }}>
        <Svg width="100%" height="100%" viewBox="0 0 300 120" style={styles.svg}>
          
          <AnimatedG style={animFlip}>
            {/* Sleeping Z's bubbles */}
            {state === 'sleeping' && (
              <G>
                <AnimatedG style={animZ1}>
                  <SvgText x="110" y="30" fill={colors.accent} fontSize="14" fontWeight="bold">z</SvgText>
                </AnimatedG>
                <AnimatedG style={animZ2}>
                  <SvgText x="120" y="20" fill={colors.accent} fontSize="18" fontWeight="bold">Z</SvgText>
                </AnimatedG>
              </G>
            )}

            <G id="dog-body-group">
              {/* Tail */}
              <AnimatedPath
                style={animTail}
                d="M210 60 Q225 55 220 40"
                stroke={colors.dogPrimary}
                strokeWidth="6"
                strokeLinecap="round"
                fill="none"
              />

              {/* Legs Shadow (behind) */}
              <Rect x="189" y="80" width="8" height="15" rx="3" fill={colors.dogSecondary} />
              <Rect x="156" y="80" width="8" height="15" rx="3" fill={colors.dogSecondary} />

              {/* Body */}
              <AnimatedRect
                style={animBody}
                x="140"
                y="55"
                width="70"
                height="25"
                rx="10"
                fill={colors.dogPrimary}
              />

              {/* Back Leg Main */}
              <AnimatedRect
                style={animLegBack}
                x="195"
                y="80"
                width="8"
                height="15"
                rx="3"
                fill={colors.dogPrimary}
              />

              {/* Collar & Tag */}
              <Rect
                x="140"
                y="50"
                width="6"
                height="26"
                rx="2"
                fill={colors.accent}
                transform="rotate(-15 140 50)"
              />
              <Circle cx="140" cy="74" r="3.5" fill="#F1C40F" />

              {/* Front Leg Main */}
              <AnimatedRect
                style={animLegFront}
                x="150"
                y="80"
                width="8"
                height="15"
                rx="3"
                fill={colors.dogPrimary}
              />

              {/* Head & Face */}
              <AnimatedG style={animHead}>
                <Ellipse cx="140" cy="50" rx="20" ry="15" fill={colors.dogPrimary} />
                {/* Snout */}
                <Path d="M120 50 Q110 50 110 55 Q115 62 130 58 Z" fill={colors.dogPrimary} />
                <Circle cx="110" cy="53" r="3" fill="#2d221e" />

                {/* Ear */}
                <AnimatedPath
                  style={animEar}
                  d="M140 42 C150 42, 152 70, 142 70 C132 70, 135 42, 140 42"
                  fill={colors.dogSecondary}
                />

                {/* Eye (adjusts if sleeping or awake) */}
                {state === 'sleeping' ? (
                  <Path d="M128 48 Q130 50 132 48" stroke="#000" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                ) : (
                  <Circle cx="130" cy="48" r="2.5" fill="#000" />
                )}
              </AnimatedG>

            </G>
          </AnimatedG>
        </Svg>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  svg: {
    overflow: 'visible'
  }
});
