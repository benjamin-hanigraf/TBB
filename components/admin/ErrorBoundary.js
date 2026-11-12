'use client';
import { Component } from 'react';
// If anything inside the app fails, show a clear message instead of a blank page. With `screen`, only that screen is replaced and the menu stays.
export default class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e) { console.error('admin error', e); }
  render() {
    if (!this.state.failed) return this.props.children;
    if (this.props.screen) return (<div className="ad-page"><div className="ad-login" style={{ margin: '48px auto' }}><h1>This screen could not open</h1><p>The rest of the app still works. Your data is safe.</p>
      <div className="ad-actions" style={{ justifyContent: 'center' }}><button className="ad-btn" onClick={() => location.reload()}>Reload</button><a className="ad-btn ghost" href="/manager">Go to Home</a></div></div></div>);
    return (<div className="ad-center"><div className="ad-login"><h1>Something went wrong</h1><p>The Manager app could not show this screen. Your data is safe.</p>
      <button className="ad-btn" onClick={() => location.reload()}>Reload</button></div></div>);
  }
}
