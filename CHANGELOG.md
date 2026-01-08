# Changelog

All notable changes to this project will be documented in this file.

## [3.0.1] - 2026-01-08

### Added
- Comprehensive manga reading experience with custom zoom and pan controls
- Manga section on explore page with dedicated discovery interface
- Pagination system for episodes and chapters (50 items per page) with range selector cards
- Sort order toggle (ascending/descending) for episode and chapter lists
- Readlist functionality with Appwrite cloud sync for manga tracking
- Read history tracking with Appwrite integration and duplicate prevention

### Changed
- Secondary background theme color updated for more soothing visual experience
- Episode and chapter lists now paginated by default to improve performance with large content catalogs

### Improved
- Mobile cache management with FileSystem.cacheDirectory for proper Android/iOS handling
- Watch history reliability with 1000ms minimum duration validation to prevent invalid entries
- Read history sync optimization with 30-second throttling and automatic duplicate cleanup
- Better UX for content with hundreds of episodes/chapters through intelligent pagination
- Image cache cleanup with age-based (24h) and size-based (300MB) strategies

### Fixed
- Invalid 1ms/1ms watch history entries being saved before video loads
- Navigation stack issues with proper router.replace() usage throughout the app
- Cache directory access on mobile devices using correct FileSystem API
- Storage bloat from manga page caching with automatic cleanup integration

## [2.0.0] - 2025-11-08

### Added
- Next and previous episode controls directly inside the streaming player for quicker navigation
- Appwrite-driven push notifications with device-targeted FCM delivery

### Changed
- Playback speed selector redesigned into a compact chip-based interface optimized for portrait and landscape
- Streaming screen state management overhauled to rely on reducers and leaner hooks for smoother performance

### Fixed
- Watched episode markers now honor Appwrite watch history `audioType`, keeping SUB and DUB progress separate
- Decoupled the time counter from the seeker so progress updates no longer cause layout shifts

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
