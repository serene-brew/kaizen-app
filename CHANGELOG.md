# Changelog

All notable changes to this project will be documented in this file.

## [1.1.1] - 2025-09-17

### Changed
- Navigation bar now matches app's dark theme (#161622) instead of system default
- Buffer loader overlay changed from dark semi-transparent to fully transparent background
- Watch history architecture completely revamped with delete-create pattern and 2-minute save intervals
- Reduced API usage by 80-90% through intelligent throttling and duplicate prevention

### Improved
- Streaming experience with less intrusive buffer loader that only appears for real buffering events
- Watch history reliability with immediate episode tracking prevents lost viewing sessions
- Database efficiency with automatic cleanup of duplicate documents during login
- Performance optimization with smart save throttling (10-second local, 60-second cloud intervals)
- Better user experience with navigation bar that seamlessly integrates with app UI

### Fixed
- Race condition in initial watch history entry creation that caused multiple duplicate entries
- Excessive API requests during watch history saves that could overwhelm cloud backend
- Buffer loader appearing randomly during smooth video playback
- Navigation bar theme inconsistency with overall app design
- Missing episode entries for short viewing sessions or quick app exits

## [1.1.0] - 2025-08-28

### Added
- Version handler for auto-update reminders during app startup
- Manual sync button in empty watchlist when initial sync fails
- Buffering loader for streaming video player during buffering
- New custom alert box

### Changed
- Revamped `more.tsx` page for better user accessibility with specialized watch history section at the top
- Corrected `watchlist.tsx` page card sizes for dynamic accessibility
- Updated download manager logic to support both browser-level downloads and local app integrated downloads
- Improved carousel in `explore.tsx` to use infinite scrolling instead of returning to start
- Enhanced details page to show full title in description first line to prevent overflow issues

### Improved
- Alert box styling changed from light to custom UI specific dark theme to complement overall app UI
- App integrated download action dialogue now dynamically handled with buttons on downloaded item cards
- Better user experience with improved navigation and accessibility features
- Enhanced download management with dual download support

## [1.0.2] - 2025-06-02

### Changed
- Fixed the Download manager issues of unresponsive downloaded card delete button
- Now only episodes will be stored in local storage only and will be cleared from the app for optimal storage management
- Removed total storage display from downloads page
- Removed storage used section from more page settings
- Optimized UI by removing misleading storage counters that showed 0 bytes due to cache clearing optimization

### Improved
- Cleaner downloads management interface
- Better user experience without confusing storage information
- Streamlined more page layout

## [1.0.1] - 2025-05-27

### Added
- Initial release
- Anime streaming functionality
- User authentication with OTP
- Watchlist management
- Watch history tracking
- Offline downloads
- Search functionality
- Dark theme

### Features
- Cross-platform support (Android & iOS)
- Cloud sync with Appwrite
- Beautiful UI with smooth animations
- Multiple video qualities
- Personal recommendations

## [Unreleased]

### Planned
- Streaming Quality selector
- Picture-in-picture mode
- Chromecast support
