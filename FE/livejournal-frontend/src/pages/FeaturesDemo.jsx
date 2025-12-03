import { useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import PullToRefresh from '../components/PullToRefresh/PullToRefresh';

const FeaturesDemo = () => {
  const [refreshCount, setRefreshCount] = useState(0);

  const handleRefresh = async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshCount(prev => prev + 1);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <PullToRefresh onRefresh={handleRefresh}>
        <div style={{ padding: '2rem', color: 'white', textAlign: 'center', minHeight: '100vh' }}>
          <div
            style={{ opacity: 1, transform: 'translateY(0)' }}
          >
            <Sparkles size={64} style={{ margin: '2rem auto' }} />
            <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
              World-Class Features Demo
            </h1>
            <p style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>
              Pull down to refresh • Refreshed {refreshCount} times
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px', margin: '0 auto' }}>
              <div
                style={{ opacity: 1 }}
              >
                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '12px' }}>
                  <RefreshCw size={24} style={{ margin: '0 auto 0.5rem' }} />
                  <p>✨ Page transitions active on all routes</p>
                  <p>🔄 Pull-to-refresh enabled</p>
                  <p>🤖 AI-powered welcome screen</p>
                  <p>🔒 Secure authentication</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PullToRefresh>
    </div>
  );
};

export default FeaturesDemo;
