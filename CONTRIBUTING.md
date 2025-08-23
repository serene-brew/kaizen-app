# Contributing to Kaizen 🚀

Thanks for your interest in contributing! Please follow these simple guidelines.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/serene-brew/kaizen-app.git`
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b feature/your-feature`
5. Make your changes
6. Commit: `git commit -m "Add your feature"`
7. Push: `git push origin feature/your-feature`
8. Open a Pull Request

## Code Guidelines

- Follow TypeScript best practices
- Use meaningful commit messages
- Test your changes before submitting
- Follow the existing code style

## Issues

- Check existing issues before creating new ones
- Use clear, descriptive titles
- Provide steps to reproduce bugs
- Include relevant details (OS, device, etc.)

## Questions?

Feel free to open an issue for any questions or discussions.

## 🛠️ Development Setup

### Environment Configuration
Create a `.env` file with the following variables:
```env
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_PLATFORM_ID=your_platform_id
APPWRITE_DATABASE_ID=your_database_id
APPWRITE_WATCHLIST_COLLECTION_ID=your_collection_id
APPWRITE_WATCHHISTORY_COLLECTION_ID=your_collection_id
GOOGLE_CLIENT_ID_WEB=your_google_client_id
```

### Development Commands
```bash
# Start development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run tests
npm test

# Run linting
npm run lint

# Type checking
npx tsc --noEmit
```

## 🤝 How to Contribute

### Types of Contributions
We welcome various types of contributions:

- 🐛 **Bug Fixes** - Fix issues and improve stability
- ✨ **New Features** - Add new functionality
- 📚 **Documentation** - Improve or add documentation
- 🎨 **UI/UX Improvements** - Enhance user interface and experience
- ⚡ **Performance** - Optimize app performance
- 🧪 **Tests** - Add or improve test coverage
- 🔧 **Tooling** - Improve development tools and processes

### Finding Issues to Work On
- Look for issues labeled `good first issue` for beginners
- Check `help wanted` labels for issues we need help with
- Browse `bug` labels for bug fixes
- Look at `enhancement` labels for new features

## 📝 Pull Request Process

### Before You Start
1. Check if there's an existing issue for your contribution
2. If not, create an issue first to discuss the changes
3. Fork the repository and create a new branch
4. Make your changes following our coding standards

### Creating a Pull Request
1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-number-description
   ```

2. **Make Your Changes**
   - Write clean, readable code
   - Follow existing code style and patterns
   - Add tests for new functionality
   - Update documentation as needed

3. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: add awesome new feature"
   ```
   
   Follow [Conventional Commits](https://conventionalcommits.org/) format:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation changes
   - `style:` for code style changes
   - `refactor:` for code refactoring
   - `test:` for adding tests
   - `chore:` for maintenance tasks

4. **Push to Your Fork**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create Pull Request**
   - Go to GitHub and create a pull request
   - Fill out the pull request template
   - Link to any related issues
   - Request review from maintainers

### Pull Request Requirements
- [ ] Code follows project style guidelines
- [ ] Self-review of the code has been performed
- [ ] Code is commented, particularly in hard-to-understand areas
- [ ] Corresponding changes to documentation have been made
- [ ] Changes generate no new warnings
- [ ] Tests have been added that prove the fix/feature works
- [ ] New and existing unit tests pass locally

## 🐛 Issue Guidelines

### Before Creating an Issue
1. Search existing issues to avoid duplicates
2. Check if the issue exists in the latest version
3. Try to reproduce the issue

### Creating a Good Issue
Use our issue templates:
- **Bug Report** - For reporting bugs
- **Feature Request** - For suggesting new features
- **Documentation** - For documentation improvements

Include:
- Clear, descriptive title
- Detailed description of the problem/feature
- Steps to reproduce (for bugs)
- Expected vs actual behavior
- Screenshots/videos if applicable
- Environment details (OS, device, app version)

## 📋 Coding Standards

### TypeScript
- Use TypeScript for all new code
- Define proper interfaces and types
- Avoid `any` type when possible
- Use meaningful variable and function names

### React Native / React
- Use functional components with hooks
- Follow React best practices
- Use proper state management patterns
- Implement error boundaries where appropriate

### Code Style
- Use consistent indentation (2 spaces)
- Follow existing naming conventions
- Use meaningful component and variable names
- Keep functions small and focused
- Add comments for complex logic

### File Organization
```
components/
├── ComponentName/
│   ├── index.ts          # Export file
│   ├── ComponentName.tsx # Main component
│   └── styles.ts         # Component styles
```

### Import Order
```typescript
// React imports
import React from 'react';

// React Native imports
import { View, Text } from 'react-native';

// Third-party library imports
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Local imports
import { useWatchlist } from '../../contexts/WatchlistContext';
import Colors from '../../constants/Colors';
import { styles } from './styles';
```

## 🧪 Testing Guidelines

### Test Structure
- Write unit tests for utility functions
- Create integration tests for complex features
- Add component tests for UI interactions
- Include end-to-end tests for critical flows

### Test Naming
```typescript
describe('WatchlistContext', () => {
  it('should add anime to watchlist when user is authenticated', () => {
    // Test implementation
  });
  
  it('should show error when trying to add anime without authentication', () => {
    // Test implementation
  });
});
```

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

## 📚 Documentation

### Code Documentation
- Add JSDoc comments for functions and components
- Document complex algorithms and business logic
- Include usage examples for reusable components

### README Updates
- Update README.md for new features
- Add screenshots for UI changes
- Update installation/setup instructions if needed

### API Documentation
- Document new API endpoints
- Include request/response examples
- Document error codes and messages

## 🔍 Review Process

### Code Review Checklist
- [ ] Code follows project standards
- [ ] Tests are comprehensive and passing
- [ ] Documentation is updated
- [ ] No breaking changes without proper migration
- [ ] Performance implications considered
- [ ] Security implications reviewed
- [ ] Accessibility requirements met

### Review Timeline
- Initial review: Within 2-3 business days
- Follow-up reviews: Within 1-2 business days
- Merge: After approval from at least one maintainer

## 🏷️ Release Process

We follow semantic versioning (SemVer):
- `MAJOR` version for incompatible API changes
- `MINOR` version for backwards-compatible functionality
- `PATCH` version for backwards-compatible bug fixes

## 🙋‍♀️ Getting Help

If you need help with your contribution:

<!-- 1. **Documentation** - Check our [Wiki](https://github.com/serene-brew/kaizen-app/wiki) -->
1. **Issues** - Create a discussion issue
<!-- 3. **Discord** - Join our [community Discord](https://discord.gg/kaizen) -->
2. **Email** - Contact us at serene.brew.git@gmail.com

## 🎉 Recognition

Contributors will be:
- Added to our [Contributors](CONTRIBUTORS.md) list
- Mentioned in release notes
- Given special recognition in our community

Thank you for contributing to Kaizen! 🚀
