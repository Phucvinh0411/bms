# Stage 1: Build
FROM maven:3.9.6-eclipse-temurin-21-jammy AS build
WORKDIR /app

# Ensure timezone database and Java tzdb provider are present to avoid TZDB EOF
RUN apt-get update && apt-get install -y --no-install-recommends tzdata ca-certificates \
	&& rm -rf /var/lib/apt/lists/*

# Set MAVEN_OPTS and ensure Java uses UTC timezone; JAVA_TOOL_OPTIONS applies very early
ENV MAVEN_OPTS="-Duser.timezone=UTC"
ENV JAVA_TOOL_OPTIONS="-Duser.timezone=UTC"
ENV TZ=UTC

# Copy pom.xml first to leverage Docker layer caching
COPY pom.xml .

# Copy source code and build
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Runtime
FROM eclipse-temurin:21-jre-jammy

# Removed non-root user temporarily to bypass Windows Docker Desktop passwd bug

WORKDIR /app

# Copy the JAR file to the runtime stage
COPY --from=build /app/target/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
