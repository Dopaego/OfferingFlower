const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const isDev = process.env.NODE_ENV !== 'production';

module.exports = {
  mode: isDev ? 'development' : 'production',
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'js/[name].[contenthash:8].js',
    clean: true,
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  module: {
    rules: [
      // TypeScript + JSX（使用 babel-loader）
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { targets: 'last 2 chrome versions' }],
              ['@babel/preset-react', { runtime: 'automatic' }],
              '@babel/preset-typescript',
            ],
            plugins: [['@babel/plugin-transform-runtime', { corejs: false }]],
          },
        },
      },
      // 普通 CSS（含 OpenLayers 的 ol.css）
      {
        test: /\.css$/,
        use: [isDev ? 'style-loader' : MiniCssExtractPlugin.loader, 'css-loader'],
      },
      // SCSS Modules（组件级样式）
      {
        test: /\.module\.scss$/,
        use: [
          isDev ? 'style-loader' : MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: { modules: { localIdentName: '[local]__[hash:base64:5]' } },
          },
          'sass-loader',
        ],
      },
      // 普通 SCSS（非 module）
      {
        test: /\.scss$/,
        exclude: /\.module\.scss$/,
        use: [isDev ? 'style-loader' : MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader'],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
      favicon: false,
    }),
    ...(isDev ? [] : [new MiniCssExtractPlugin({ filename: 'css/[name].[contenthash:8].css' })]),
  ],
  devServer: {
    port: 3001,
    hot: true,
    open: true,
    historyApiFallback: true,
  },
  devtool: isDev ? 'cheap-module-source-map' : false,
};