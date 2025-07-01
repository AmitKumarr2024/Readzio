import React from 'react';
import { Helmet } from 'react-helmet';

class NullComponent2 extends React.Component {
  componentDidMount() {
    // Move side effects here
    document.title = this.props.title || 'Default Title';
  }

  render() {
    const { title = 'Default Title' } = this.props;
    return (
      <Helmet>
        <title>{title}</title>
      </Helmet>
    );
  }
}

export default NullComponent2;