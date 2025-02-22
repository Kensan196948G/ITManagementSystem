// ...existing code...

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading, error } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login');
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">
          <Typography>{error}</Typography>
          <Button onClick={() => navigate('/login')}>
            ログインページに戻る
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <SideNav />
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </Box>
    </Box>
  );
};