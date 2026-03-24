FROM python:3.11-slim
WORKDIR /app

# Use Tsinghua mirror for faster downloads in China
RUN sed -i 's/deb.debian.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apt/sources.list.d/debian.sources \
    && apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 依赖层（单独分层，代码不变就使用缓存）
COPY pyproject.toml .
RUN pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple && \
    pip install hatchling && \
    mkdir -p app && touch app/__init__.py && \
    pip install ".[dev]"

# 代码层（修改代码时只重建这层，跳过重新安装依赖）
COPY . .
