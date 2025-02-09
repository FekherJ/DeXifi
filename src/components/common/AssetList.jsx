import React from "react";

const AssetList = () => {
  const assets = [
    { icon: "🔷", name: "ETH" },
    { icon: "🟠", name: "BTC" },
    { icon: "💵", name: "USD" },
  ];

  return (
    <div>
      <h3 className="text-xl font-bold mb-6">Assets</h3>
      <ul className="space-y-6">
        {assets.map((asset) => (
          <li key={asset.name} className="flex items-center gap-4">
            <span className="text-2xl">{asset.icon}</span>
            <span className="text-lg font-semibold">{asset.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AssetList;
