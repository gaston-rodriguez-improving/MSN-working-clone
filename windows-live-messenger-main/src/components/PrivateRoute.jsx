import React from 'react';
import { Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

const PrivateRoute = ({ element: Component, ...rest }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return null;
  return user ? <Component {...rest} /> : <Navigate to="/login" />;
};

export default PrivateRoute;
