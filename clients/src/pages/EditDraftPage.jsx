import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getSinglePost } from "../store/postSlice";
import EditPollStatusModal from "../components/Post/EditPollStatusModal";

import { toast } from "react-hot-toast";

const EditDraftPage = () => {
  const { slug } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(true);
  const [localBlocks, setLocalBlocks] = useState([]);

  const { currentPost, postLoading } = useSelector((state) => state.post);

  useEffect(() => {
    if (slug) {
      dispatch(getSinglePost({ slug, isGuest: false }));
    }
  }, [slug, dispatch]);

  useEffect(() => {
    if (currentPost?.blocks) {
      setLocalBlocks(currentPost.blocks);
    }
  }, [currentPost]);

  const handleClose = () => {
    setIsOpen(false);
    navigate(-1);
  };

  if (postLoading || !currentPost) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <p className="text-gray-500">Loading draft...</p>
      </div>
    );
  }

  return (
    <EditPollStatusModal
      isOpen={isOpen}
      onClose={handleClose}
      post={currentPost}
      setBlocks={setLocalBlocks}
    />
  );
};

export default EditDraftPage;
