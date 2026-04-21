import React, { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';

const COLORS = {
  'High': '#ef4444',
  'Medium': '#f97316',
  'Low': '#22c55e'
};

const RiskDistributionCharts = ({ risks = [] }) => {
  const pieData = useMemo(() => {
    let high = 0, medium = 0, low = 0;
    risks.forEach(r => {
      if (r.severity === 'High') high++;
      else if (r.severity === 'Medium') medium++;
      else if (r.severity === 'Low') low++;
    });

    return [
      { name: 'High', value: high },
      { name: 'Medium', value: medium },
      { name: 'Low', value: low }
    ].filter(entry => entry.value > 0);
  }, [risks]);


  const barData = useMemo(() => {
    const componentCounts = {};
    risks.forEach(r => {
      // Sometimes it's in affectedComponent, sometimes sourceModule/destinationModule
      const comps = [];
      if (r.affectedComponent) comps.push(r.affectedComponent);
      if (r.sourceModule) comps.push(r.sourceModule);
      
      // if dealing with array of components or just single strings.
      comps.forEach(comp => {
         if (comp) {
             componentCounts[comp] = (componentCounts[comp] || 0) + 1;
         }
      });
    });

    return Object.entries(componentCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // top 5
  }, [risks]);

  // Fallback for empty risks
  if (risks.length === 0) {
      return null;
  }

  return (
    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
      <div className="card" style={{ flex: '1 1 400px', minWidth: '300px' }}>
        <div className="card-title"><span className="icon">📊</span> Severity Distribution</div>
        <div style={{ width: '100%', height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                ))}
              </Pie>
              <Tooltip 
                 contentStyle={{ backgroundColor: '#1a2035', border: '1px solid #374151', borderRadius: '4px', color: '#fff' }}
                 itemStyle={{ color: '#fff' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card" style={{ flex: '1 1 400px', minWidth: '300px' }}>
        <div className="card-title"><span className="icon">📈</span> Top Affected Components</div>
        <div style={{ width: '100%', height: '300px' }}>
          {barData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={barData}
              margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
              <XAxis type="number" stroke="#9ca3af" />
              <YAxis dataKey="name" type="category" width={100} stroke="#9ca3af" tick={{fontSize: 12}} />
              <Tooltip 
                cursor={{fill: '#374151', opacity: 0.4}} 
                contentStyle={{ backgroundColor: '#1a2035', border: '1px solid #374151', borderRadius: '4px', color: '#fff' }}
              />
              <Bar dataKey="count" fill="#4f46e5" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
          ) : (
             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>
                 No component data available
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RiskDistributionCharts;
