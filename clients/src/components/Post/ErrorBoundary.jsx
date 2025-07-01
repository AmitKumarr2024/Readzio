import React from "react";

class ErrorBoundary extends React.Component {
  state = { hasError: false, errorMessage: "" };

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error.message || "Something went wrong",
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center text-red-600">
          {this.state.errorMessage}
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;