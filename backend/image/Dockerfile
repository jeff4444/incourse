FROM public.ecr.aws/lambda/python:3.12

COPY requirements.txt ${LAMBDA_TASK_ROOT}

RUN pip install -r requirements.txt

# Copy all files in /src including subdirectories
COPY src/ ${LAMBDA_TASK_ROOT}

CMD ["main.handler"]