FROM python:3.8-slim

WORKDIR /srv
# RUN apk add --update --no-cache g++
# ENV PYTHONPATH=/usr/lib/python3.8/site-packages
# RUN apk add --update --no-cache g++
RUN apt-get update \
    && apt-get install -y --no-install-recommends g++ \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install numpy

COPY requirements.txt /srv/

RUN pip3 install -r requirements.txt

COPY *.py /srv/

CMD python3 main.py
