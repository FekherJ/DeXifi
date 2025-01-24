import { renderReactDashboard } from './components/react-dashboard';

// npm install react react-dom
// npx parcel build src/index.js --dist-dir dist

// Example usage
renderReactDashboard({
    walletBalance: '10.000 ETH',
    stakingBalance: '5.000 STK',
    rewardBalance: '2.000 RWD',
    apy: '12.34%'
});
