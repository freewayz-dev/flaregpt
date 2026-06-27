// src/components/common/PageSkeleton.jsx
export default function PageSkeleton({ isLoading, children, skeleton }) {
  if (isLoading) {
    return <div className="animate-pulse space-y-4">{skeleton}</div>;
  }
  return children;
}