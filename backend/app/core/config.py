from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", ".env.local"),  # .env.local sobrescreve .env no dev local
        extra="ignore",
    )

    # Banco: DATABASE_URL (Railway/Heroku) tem precedência sobre as POSTGRES_*.
    DATABASE_URL: str = ""
    POSTGRES_DB: str = "academia"
    POSTGRES_USER: str = "academia"
    POSTGRES_PASSWORD: str = "academia"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432

    # Auth
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 12
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # App
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # Biblioteca
    # Janela (dias) em que um modelo criado/atualizado aparece como "novo"/"atualizado".
    NOVIDADE_DIAS: int = 30
    # Tamanho máximo de upload (MB) dos arquivos dos modelos e da foto do mentor.
    UPLOAD_MAX_MB: int = 25

    @property
    def database_url(self) -> str:
        if self.DATABASE_URL:
            # Railway entrega "postgres://"; o SQLAlchemy 2 só aceita "postgresql://".
            url = self.DATABASE_URL
            if url.startswith("postgres://"):
                url = "postgresql+psycopg2://" + url[len("postgres://"):]
            elif url.startswith("postgresql://"):
                url = "postgresql+psycopg2://" + url[len("postgresql://"):]
            return url
        return (
            f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )


settings = Settings()
