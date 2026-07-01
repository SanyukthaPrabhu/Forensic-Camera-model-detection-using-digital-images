import { Suspense, lazy } from 'react';

const Spline = lazy(() => import('@splinetool/react-spline'));

/**
 * Lazy-loaded Spline 3D scene with a forensic-themed loader fallback.
 * Uses React.Suspense so the rest of the page renders immediately.
 */
export function SplineScene({ scene, className, style }) {
  return (
    <Suspense
      fallback={
        <div className="spline-loader-wrap">
          <div className="spline-loader-ring" />
          <span className="spline-loader-text">LOADING 3D SCENE...</span>
        </div>
      }
    >
      <Spline scene={scene} className={className} style={style} />
    </Suspense>
  );
}
