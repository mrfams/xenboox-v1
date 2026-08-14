import { useEffect, useRef } from "react";
import { Animated, View, type ViewProps } from "react-native";
import { clsx } from "clsx";

/**
 * Animated skeleton placeholder (pulsing opacity).
 * Used for every loading state so screens never flash bare "Loading..." text.
 */
export function Skeleton({ className, ...props }: ViewProps) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      className={clsx("rounded-md bg-slate-200 dark:bg-slate-700", className)}
      style={{ opacity }}
      {...props}
    />
  );
}

/** Full-height centered loading screen (list/detail pages). */
export function ScreenSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <View className="flex-1 gap-4 bg-slate-50 p-4 dark:bg-slate-900">
      {Array.from({ length: rows }).map((_, i) => (
        <View
          key={i}
          className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
        >
          <Skeleton className="mb-3 h-4 w-1/3" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-5/6" />
        </View>
      ))}
    </View>
  );
}
