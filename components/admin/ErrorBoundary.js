'use client';
import { Component } from 'react';
// If anything inside the app fails, show a clear message instead of a blank page.
export default class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e) { console.error('admin error', e); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (<div className="ad-center"><div className="ad-login"><h1>Something went wrong</h1><p>The Studio app could not show this screen. Your data is safe.</p>
      <button className="ad-btn" onClick={() => location.reload()}>Reload</button></div></div>);
  }
}
