# 编译阶段
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
# 拷贝 csproj 并还原依赖
COPY ["QuickHouse.Api.csproj", "./"]
RUN dotnet restore "QuickHouse.Api.csproj"
# 拷贝其余代码并发布
COPY . .
RUN dotnet publish "QuickHouse.Api.csproj" -c Release -o /app/publish

# 运行阶段
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
# 创建数据库持久化目录
RUN mkdir -p /app/data
# .NET 8 容器默认监听 8080 端口
EXPOSE 8080
ENTRYPOINT ["dotnet", "QuickHouse.Api.dll"]