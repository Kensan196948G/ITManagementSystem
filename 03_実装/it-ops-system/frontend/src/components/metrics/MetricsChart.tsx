import React from 'react';
import { Line } from 'react-chartjs-2';
import { ChartOptions } from 'chart.js';

const defaultOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
    },
  },
  scales: {
    y: {
      type: 'linear',
      beginAtZero: true,
      ticks: {
        callback: function(tickValue: number | string): string {
          return `${tickValue}%`;
        }
      }
    }
  }
};

const data = {
  labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
  datasets: [
    {
      label: 'My First dataset',
      backgroundColor: 'rgba(75,192,192,0.2)',
      borderColor: 'rgba(75,192,192,1)',
      pointBackgroundColor: 'rgba(75,192,192,1)',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: 'rgba(75,192,192,1)',
      data: [65, 59, 80, 81, 56, 55, 40]
    }
  ]
};

const LineChart = () => (
  <div>
    <h2>Line Example</h2>
    <Line data={data} options={defaultOptions} />
  </div>
);

export default LineChart;
