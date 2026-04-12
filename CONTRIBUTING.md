# Contributing to GXeon AI

First off, thank you for considering contributing to GXeon AI! This is a decentralized infrastructure project, and community contributions are essential for its growth.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Git
- A Supabase account (for local development)
- Vercel CLI (optional, for deployment testing)

### Setting Up Your Development Environment

1. **Fork the repository**
   
   Click the "Fork" button at the top right of the GitHub page.

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/GXEON-AI.git
   cd GXEON-AI
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials:
   # - VITE_SUPABASE_URL
   # - VITE_SUPABASE_ANON_KEY
   # - Add test wallet addresses (never real private keys)
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Verify everything works**
   - Dashboard should load at `http://localhost:5173`
   - Supabase connection should show green status
   - No console errors

## 📋 Contribution Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring

### 2. Make Your Changes

- Follow existing code style (Prettier/ESLint)
- Write meaningful commit messages
- Add tests for new functionality
- Update documentation if needed

### 3. Test Your Changes

```bash
# Run linting
npm run lint

# Run tests
npm test

# Build for production
npm run build
```

### 4. Commit Guidelines

Use conventional commits format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Code style (formatting)
- `refactor` - Code change neither fix nor feature
- `test` - Adding/updating tests
- `chore` - Build process, dependencies

Examples:
```
feat(autonolas): add real-time task telemetry
fix(gelato): resolve duplicate execution logs
docs(readme): update deployment instructions
```

### 5. Submit a Pull Request

1. Push your branch to your fork
   ```bash
   git push origin feature/your-feature-name
   ```

2. Open a Pull Request on the original repository

3. Fill out the PR template with:
   - **Description** - What and why
   - **Changes** - List of modifications
   - **Testing** - How you verified it works
   - **Screenshots** - If UI changes

4. Wait for review - maintainers will respond within 48 hours

## 🎯 Areas Needing Contributions

### High Priority
- [ ] Additional Web3 function integrations
- [ ] Performance optimizations for real-time data
- [ ] Mobile responsiveness improvements

### Medium Priority
- [ ] Extended test coverage
- [ ] Documentation translations
- [ ] Additional data visualization components

### Documentation
- [ ] Tutorial videos for setup
- [ ] API endpoint documentation
- [ ] Deployment guides for other platforms

## 🧪 Testing Guidelines

### Unit Tests
```bash
npm run test:unit
```

### Integration Tests
```bash
npm run test:integration
```

### Manual Testing Checklist
- [ ] Dashboard loads without errors
- [ ] Supabase connection works
- [ ] Autonolas telemetry displays correctly
- [ ] Gelato execution logs render properly
- [ ] Mobile layout is responsive

## 📝 Code Style

- **JavaScript/TypeScript**: Follow ESLint config
- **CSS**: Use Tailwind classes, avoid custom CSS when possible
- **Components**: Functional components with hooks
- **Naming**: camelCase for variables, PascalCase for components

## 🏆 Recognition

Contributors will be:
- Listed in the project README
- Mentioned in release notes
- Added to our "Contributors" page in the dashboard

## ❓ Questions?

- Open a [GitHub Discussion](https://github.com/xpex-systems-ai/GXEON-AI/discussions)
- Email: contact@xpex-systems.ai
- Discord: [Join our community](https://discord.gg/xpex)

---

By contributing, you agree that your contributions will be licensed under the MIT License.
