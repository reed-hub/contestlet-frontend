# Contestlet Frontend

A React + TypeScript + Tailwind CSS frontend application for contest management and participation.

## Features

- **Landing Page** (`/`) - Welcome page with contest ID entry
- **Contest Entry** (`/enter/:contest_id`) - Contest participation form  
- **Admin Portal** (`/admin`) - Admin login and dashboard
- **Responsive Design** - Mobile-friendly layout with Tailwind CSS
- **React Router** - Client-side routing

## Tech Stack

- React 19
- TypeScript
- Tailwind CSS
- React Router DOM

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## 📱 Twilio SMS Integration

This application integrates with **Twilio Verify API** for SMS-based authentication. See [TWILIO_SETUP.md](./TWILIO_SETUP.md) for complete configuration instructions.

**Development Mode**: Uses mock SMS with OTP code `123456`
**Production Mode**: Sends real SMS via Twilio Verify API

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
