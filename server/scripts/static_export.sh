
cd $(dirname $0)/../../

echo "Current directory: $(pwd)"

make client-build-static

if [ $? -eq 0 ]; then
  echo "Static export completed successfully"
  exit 0
else
  echo "Static export failed"
  exit 1
fi
