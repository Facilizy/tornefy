import { Navigate, useLocation, useParams } from "react-router-dom";

export default function LegacyTrainingRedirect() {
  const { id } = useParams();
  const location = useLocation();

  if (!id) return <Navigate to="/scrims" replace />;

  return (
    <Navigate
      to={`/scrim/${id}${location.search || ""}${location.hash || ""}`}
      replace
    />
  );
}
