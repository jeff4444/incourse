FROM public.ecr.aws/docker/library/python:3.12.0-slim-bullseye

# Install the Lambda Web Adapter extension
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.1 /lambda-adapter /opt/extensions/lambda-adapter
ENV PORT=8000
COPY requirements.txt ${LAMBDA_TASK_ROOT}

RUN pip install -r requirements.txt

# Copy all files in /src including subdirectories
COPY src/ ${LAMBDA_TASK_ROOT}

# Configure Lambda Web Adapter to run uvicorn
# The adapter will intercept Lambda events and forward them to the web server
CMD ["python", "main.py"]