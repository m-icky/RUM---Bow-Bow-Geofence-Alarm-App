import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, TouchableWithoutFeedback } from 'react-native';
import Svg, { Path, Rect, Circle, Ellipse, G, Line, Text as SvgText } from 'react-native-svg';
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

export default function MascotRum({ state = 'idle', type = 'dog', width = 180, height = 120, onBarkComplete }) {
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
  const flip = useSharedValue(1.0);
  const jumpY = useSharedValue(0);
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
    flip.value = 1.0;
    jumpY.value = 0;

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
    transform: [
      { translateX: 150 },
      { translateY: 60 + jumpY.value },
      { scale: flip.value },
      { translateX: -150 },
      { translateY: -60 }
    ]
  }));

  const triggerFlip = () => {
    if (isFlipping.current) return;
    isFlipping.current = true;
    
    // Play happy bark callback
    if (onBarkComplete) {
      onBarkComplete();
    }
    
    // Hop the entire dog up and down using jumpY
    jumpY.value = withSequence(
      withTiming(-30, { duration: 150 }),
      withTiming(0, { duration: 150 })
    );

    // Bounce scale using flip
    flip.value = withSequence(
      withTiming(1.15, { duration: 120 }), // Stretch up
      withTiming(0.85, { duration: 120 }), // Squish on land
      withTiming(1.0, { duration: 150 })  // Reset
    );

    // Reset flipping flag safely on the JS thread after animation finishes
    setTimeout(() => {
      isFlipping.current = false;
    }, 400);
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

            {type === 'dog' && (
              <G id="dog-body-group">
                {/* Tail */}
                <AnimatedG style={animTail}>
                  <Path
                    d="M210 60 Q225 55 220 40"
                    stroke={colors.dogPrimary}
                    strokeWidth="6"
                    strokeLinecap="round"
                    fill="none"
                  />
                </AnimatedG>

                {/* Legs Shadow (behind) */}
                <Rect x="189" y="80" width="8" height="15" rx="3" fill={colors.dogSecondary} />
                <Rect x="156" y="80" width="8" height="15" rx="3" fill={colors.dogSecondary} />

                {/* Body */}
                <AnimatedG style={animBody}>
                  <Rect
                    x="140"
                    y="55"
                    width="70"
                    height="25"
                    rx="10"
                    fill={colors.dogPrimary}
                  />
                </AnimatedG>

                {/* Back Leg Main */}
                <AnimatedG style={animLegBack}>
                  <Rect
                    x="195"
                    y="80"
                    width="8"
                    height="15"
                    rx="3"
                    fill={colors.dogPrimary}
                  />
                </AnimatedG>

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
                <AnimatedG style={animLegFront}>
                  <Rect
                    x="150"
                    y="80"
                    width="8"
                    height="15"
                    rx="3"
                    fill={colors.dogPrimary}
                  />
                </AnimatedG>

                {/* Head & Face */}
                <AnimatedG style={animHead}>
                  <Ellipse cx="140" cy="50" rx="20" ry="15" fill={colors.dogPrimary} />
                  {/* Snout */}
                  <Path d="M120 50 Q110 50 110 55 Q115 62 130 58 Z" fill={colors.dogPrimary} />
                  <Circle cx="110" cy="53" r="3" fill="#2d221e" />

                  {/* Ear */}
                  <AnimatedG style={animEar}>
                    <Path
                      d="M140 42 C150 42, 152 70, 142 70 C132 70, 135 42, 140 42"
                      fill={colors.dogSecondary}
                    />
                  </AnimatedG>

                  {/* Eye (adjusts if sleeping or awake) */}
                  {state === 'sleeping' ? (
                    <Path d="M128 48 Q130 50 132 48" stroke="#000" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                  ) : (
                    <Circle cx="130" cy="48" r="2.5" fill="#000" />
                  )}
                </AnimatedG>
              </G>
            )}

            {type === 'cat' && (
              <G id="cat-body-group">
                {/* Tail */}
                <AnimatedG style={animTail}>
                  <Path d="M200 65 Q220 50 215 25" stroke={colors.dogPrimary} strokeWidth="5" strokeLinecap="round" fill="none" />
                </AnimatedG>
                {/* Legs Shadow */}
                <Rect x="180" y="80" width="7" height="15" rx="3" fill={colors.dogSecondary} />
                <Rect x="145" y="80" width="7" height="15" rx="3" fill={colors.dogSecondary} />
                {/* Body */}
                <AnimatedG style={animBody}>
                  <Rect x="138" y="50" width="64" height="32" rx="14" fill={colors.dogPrimary} />
                </AnimatedG>
                {/* Back Leg Main */}
                <AnimatedG style={animLegBack}>
                  <Rect x="186" y="80" width="8" height="15" rx="3" fill={colors.dogPrimary} />
                </AnimatedG>
                {/* Front Leg Main */}
                <AnimatedG style={animLegFront}>
                  <Rect x="151" y="80" width="8" height="15" rx="3" fill={colors.dogPrimary} />
                </AnimatedG>
                {/* Head, Ears, Face */}
                <AnimatedG style={animHead}>
                  <Circle cx="125" cy="45" r="15" fill={colors.dogPrimary} />
                  {/* Pointed Ears */}
                  <Path d="M115 36 L112 22 L122 32 Z" fill={colors.dogSecondary} />
                  <Path d="M135 36 L138 22 L128 32 Z" fill={colors.dogSecondary} />
                  {/* Face details */}
                  {state === 'sleeping' ? (
                    <Path d="M116 44 Q118 46 120 44 M126 44 Q128 46 130 44" stroke="#000" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                  ) : (
                    <G>
                      <Circle cx="118" cy="42" r="2" fill="#000" />
                      <Circle cx="128" cy="42" r="2" fill="#000" />
                    </G>
                  )}
                  <Path d="M121 47 L125 47 M123 47 L123 49" stroke="#000" strokeWidth="1" fill="none" />
                  {/* Whiskers */}
                  <Path d="M113 47 L105 45 M113 49 L104 50" stroke="#000" strokeWidth="1" />
                  <Path d="M133 47 L141 45 M133 49 L142 50" stroke="#000" strokeWidth="1" />
                </AnimatedG>
              </G>
            )}

            {type === 'rabbit' && (
              <G id="rabbit-body-group">
                {/* Fluffy Tail */}
                <AnimatedG style={animTail}>
                  <Circle cx="202" cy="65" r="8" fill={colors.dogSecondary} />
                </AnimatedG>
                {/* Legs Shadow */}
                <Rect x="175" y="80" width="8" height="15" rx="3" fill={colors.dogSecondary} />
                <Rect x="145" y="80" width="8" height="15" rx="3" fill={colors.dogSecondary} />
                {/* Body */}
                <AnimatedG style={animBody}>
                  <Rect x="138" y="52" width="60" height="30" rx="15" fill={colors.dogPrimary} />
                </AnimatedG>
                {/* Back Leg Main */}
                <AnimatedG style={animLegBack}>
                  <Rect x="180" y="80" width="9" height="15" rx="3" fill={colors.dogPrimary} />
                </AnimatedG>
                {/* Front Leg Main */}
                <AnimatedG style={animLegFront}>
                  <Rect x="150" y="80" width="9" height="15" rx="3" fill={colors.dogPrimary} />
                </AnimatedG>
                {/* Head & Long Ears */}
                <AnimatedG style={animHead}>
                  <Circle cx="125" cy="45" r="14" fill={colors.dogPrimary} />
                  {/* Long Ears */}
                  <AnimatedG style={animEar}>
                    <Rect x="117" y="15" width="6" height="18" rx="3" fill={colors.dogSecondary} />
                    <Rect x="127" y="17" width="6" height="18" rx="3" fill={colors.dogSecondary} />
                  </AnimatedG>
                  {/* Eyes and pink nose */}
                  {state === 'sleeping' ? (
                    <Path d="M116 44 Q119 46 122 44 M125 44 Q128 46 131 44" stroke="#000" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                  ) : (
                    <G>
                      <Circle cx="119" cy="43" r="1.8" fill="#000" />
                      <Circle cx="127" cy="43" r="1.8" fill="#000" />
                    </G>
                  )}
                  <Circle cx="123" cy="47" r="1.5" fill="#FF8A65" />
                </AnimatedG>
              </G>
            )}

            {type === 'bird' && (
              <G id="bird-body-group">
                {/* Tail feathers */}
                <AnimatedG style={animTail}>
                  <Path d="M195 65 L215 55 L210 70 Z" fill={colors.dogPrimary} />
                </AnimatedG>
                {/* Thin Legs */}
                <Line x1="160" y1="80" x2="160" y2="92" stroke={colors.dogSecondary} strokeWidth="3" />
                <Line x1="175" y1="80" x2="175" y2="92" stroke={colors.dogSecondary} strokeWidth="3" />
                {/* Body */}
                <AnimatedG style={animBody}>
                  <Circle cx="168" cy="62" r="22" fill={colors.dogPrimary} />
                </AnimatedG>
                {/* Head */}
                <AnimatedG style={animHead}>
                  <Circle cx="138" cy="46" r="14" fill={colors.dogPrimary} />
                  {/* Beak */}
                  <Path d="M125 44 L114 48 L125 52 Z" fill="#F1C40F" />
                  {/* Eye */}
                  {state === 'sleeping' ? (
                    <Path d="M131 44 Q134 46 137 44" stroke="#000" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                  ) : (
                    <Circle cx="134" cy="42" r="1.8" fill="#000" />
                  )}
                </AnimatedG>
                {/* Flapping Wing */}
                <AnimatedG style={animEar}>
                  <Path d="M158 56 Q144 64 162 76 Q176 68 158 56" fill={colors.dogSecondary} />
                </AnimatedG>
              </G>
            )}

            {type === 'fish' && (
              <G id="fish-body-group">
                {/* Back Fin */}
                <AnimatedG style={animTail}>
                  <Path d="M195 62 L215 48 L208 62 L215 76 Z" fill={colors.dogSecondary} />
                </AnimatedG>
                {/* Main Body */}
                <AnimatedG style={animBody}>
                  <Ellipse cx="160" cy="62" rx="26" ry="18" fill={colors.dogPrimary} />
                </AnimatedG>
                {/* Flippers */}
                <AnimatedG style={animLegBack}>
                  <Path d="M152 74 Q142 86 158 84" fill={colors.dogSecondary} />
                </AnimatedG>
                {/* Head & face */}
                <AnimatedG style={animHead}>
                  {state === 'sleeping' ? (
                    <Path d="M137 58 Q140 60 143 58" stroke="#000" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                  ) : (
                    <Circle cx="140" cy="58" r="1.8" fill="#000" />
                  )}
                  {/* Mouth */}
                  <Path d="M134 64 Q128 64 133 67" stroke="#000" strokeWidth="1.5" fill="none" />
                </AnimatedG>
              </G>
            )}
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
